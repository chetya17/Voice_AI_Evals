import asyncio
import os
import argparse
import sys
import logging
import json
from datetime import datetime
from pathlib import Path
import time

# Import tracing module
from tracing import SimulationTracer, set_tracer, get_tracer

# -------------------------------------------------------------------------
# LOGGING SETUP
# -------------------------------------------------------------------------
# Will be configured in main() with file handler
logger = logging.getLogger("simulation")
logger.setLevel(logging.DEBUG)

# Enable pipecat logging to see errors
logging.getLogger("pipecat").setLevel(logging.DEBUG)

# Reduce noise from some verbose libraries (optional - comment out for full debug)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("websockets").setLevel(logging.WARNING)

# -------------------------------------------------------------------------
# DEPENDENCIES
# -------------------------------------------------------------------------
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from livekit import api

# --- UPDATED IMPORTS FOR PIPECAT 0.0.98 ---
# 1. Services
from pipecat.services.google.llm import GoogleLLMService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.deepgram.tts import DeepgramTTSService

# 2. Transport (Fixed Import Path)
from pipecat.transports.livekit.transport import LiveKitTransport, LiveKitParams
from pipecat.frames.frames import TextFrame, LLMMessagesFrame

# 3. VAD and Turn Analyzers
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
from pipecat.audio.turn.smart_turn.base_smart_turn import SmartTurnParams


# -------------------------------------------------------------------------
# API Keys Configuration
# Set these environment variables before running the simulation
# -------------------------------------------------------------------------
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "wss://your-project.livekit.cloud")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
ROOM_NAME = os.getenv("ROOM_NAME", "testingsims")


async def main(bot_name: str, prompt_role: str, log_file: str = None, transcript_file: str = None, transcript_json_file: str = None, max_time: int = None, should_speak_first: bool = False, allow_interruptions: bool = True, tracing_log_file: str = None, goal_description: str = None, stop_signal_file: str = None, room_name: str = None):
    # Setup file logging if log_file is provided
    if log_file:
        log_dir = Path(log_file).parent
        log_dir.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter('%(asctime)s | %(levelname)-8s | %(name)-25s | %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    
    # Setup console logging
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    console_formatter = logging.Formatter('%(asctime)s | %(levelname)-8s | %(name)-25s | %(message)s', datefmt='%H:%M:%S')
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # Initialize transcript collector
    transcript = []
    start_time = time.time()
    
    # Initialize goal detector if API key is available
    goal_detector = None
    try:
        from goal_detector import GoalDetector
        goal_detector = GoalDetector()
        logger.info("✅ Goal detection enabled")
    except Exception as e:
        logger.info(f"⚠️ Goal detection not available: {e}")
    
    # Check for stop signal file
    stop_signal_path = Path(stop_signal_file) if stop_signal_file else None
    
    # Use provided room name or default
    actual_room_name = room_name if room_name else ROOM_NAME
    
    logger.info("=" * 60)
    logger.info(f"🤖 Starting Bot: {bot_name}")
    logger.info(f"📝 Role: {prompt_role}")
    logger.info(f"🏠 Room: {actual_room_name}")
    if max_time:
        logger.info(f"⏱️  Max Time: {max_time} seconds")
    logger.info(f"🎙️  Interruptions: {'Enabled' if allow_interruptions else 'Disabled (VAD + SmartTurn turn-taking)'}")
    logger.info("=" * 60)

    # Initialize tracing
    if tracing_log_file is None and log_file:
        # Default tracing log file in same directory as regular log
        log_dir = Path(log_file).parent
        tracing_log_file = str(log_dir / f"{bot_name}_tracing.json")
    
    tracer = SimulationTracer(bot_name=bot_name, log_file=tracing_log_file)
    set_tracer(tracer)
    logger.info(f"📊 Tracing enabled. Log file: {tracing_log_file or 'Not specified'}")

    # 1. Generate Token
    token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
        .with_identity(bot_name) \
        .with_name(bot_name) \
        .with_grants(api.VideoGrants(room_join=True, room=actual_room_name)) \
        .to_jwt()

    # 2. Configure VAD and Turn Analyzers
    logger.info("🎤 Configuring VAD (Voice Activity Detection)...")
    # Always use VAD for proper speech detection
    vad_params = VADParams(
        confidence=0.7,      # Minimum confidence for voice detection
        start_secs=0.2,      # Wait 0.2s before confirming speech start
        stop_secs=0.8,       # Wait 0.8s of silence before confirming speech stop
        min_volume=0.6       # Minimum volume threshold
    )
    vad_analyzer = SileroVADAnalyzer(params=vad_params)
    logger.info("✅ VAD configured (SileroVADAnalyzer)")
    
    # Configure SmartTurnAnalyzer when interruptions are disabled
    turn_analyzer = None
    if not allow_interruptions:
        logger.info("🧠 Configuring SmartTurnAnalyzer for end-of-turn detection...")
        # Use SmartTurnAnalyzer to detect when the other bot finishes speaking
        turn_params = SmartTurnParams(
            stop_secs=3.0,              # Max silence duration before ending turn
            pre_speech_ms=0,            # Audio to include before speech starts
            max_duration_secs=8.0        # Max segment duration
        )
        turn_analyzer = LocalSmartTurnAnalyzerV3(params=turn_params)
        logger.info("✅ SmartTurnAnalyzer configured (LocalSmartTurnAnalyzerV3)")
    else:
        logger.info("⚡ SmartTurnAnalyzer disabled (interruptions enabled)")
    
    # 3. Configure Transport with VAD and Turn Analyzers
    transport = LiveKitTransport(
        url=LIVEKIT_URL,
        token=token,
        room_name=actual_room_name,
        params=LiveKitParams(
            audio_in_enabled=True,   # <--- CRITICAL: Enable receiving audio from participants
            audio_out_enabled=True,  # Enable sending audio
            transcription_enabled=True,
            vad_analyzer=vad_analyzer,  # VAD for speech detection
            turn_analyzer=turn_analyzer  # SmartTurn for end-of-turn detection (when interruptions disabled)
        )
    )
    logger.info(f"✅ Transport configured for room: {actual_room_name}")

    # 4. Configure Services
    logger.info("🎤 Initializing STT (Deepgram)...")
    stt = DeepgramSTTService(api_key=DEEPGRAM_API_KEY)
    
    logger.info("🔊 Initializing TTS (Deepgram)...")
    tts = DeepgramTTSService(api_key=DEEPGRAM_API_KEY)
    
    logger.info("🧠 Initializing LLM (Google Gemini)...")
    llm = GoogleLLMService(
        api_key=GOOGLE_API_KEY,
        model="gemini-2.5-flash-lite"
    )
    logger.info("✅ All services initialized")

    # 5. Context & Prompts
    logger.info("📋 Setting up conversation context...")
    system_prompt = f"You are a helpful AI assistant named {bot_name}. {prompt_role} Keep your responses concise."
    messages = [{"role": "system", "content": system_prompt}]
    logger.debug(f"System prompt: {system_prompt}")
    
    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)
    
    # Track conversation for transcript
    def add_to_transcript(speaker: str, text: str, message_type: str = "message"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = {
            "timestamp": timestamp,
            "speaker": speaker,
            "type": message_type,
            "text": text
        }
        transcript.append(entry)
        logger.info(f"📝 [{speaker}] {text}")
    
    # Add initial message if bot should speak first
    # Note: We'll push this as a frame after pipeline starts, not in initial context
    initial_message = None
    if should_speak_first:
        initial_message = "Hello! I'm ready to start our conversation."
        # Don't add to messages - we'll push it as a frame after pipeline starts

    # 6. Build Pipeline with transcript tracking
    logger.info("🔧 Building pipeline...")
    
    # Custom processor to track transcripts
    from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
    from pipecat.frames.frames import TranscriptionFrame, LLMTextFrame, TTSTextFrame
    
    class InputTranscriptTracker(FrameProcessor):
        """Tracks incoming transcriptions from other participants"""
        def __init__(self, bot_name: str, add_func):
            super().__init__()
            self.bot_name = bot_name
            self.add_func = add_func
        
        async def process_frame(self, frame, direction):
            await super().process_frame(frame, direction)
            
            tracer = get_tracer()
            
            if isinstance(frame, TranscriptionFrame):
                # Log all transcriptions for debugging
                user_id = getattr(frame, 'user_id', 'Unknown')
                text = getattr(frame, 'text', '')
                logger.debug(f"🎤 Transcription received from {user_id}: {text}")
                
                # Track transcriptions from other participants (not from this bot)
                if user_id != self.bot_name:
                    self.add_func(user_id or "Other", text, "transcription")
                    # Record STT completion
                    if tracer:
                        tracer.record_stt_end(text, {"user_id": user_id})
            
            await self.push_frame(frame, direction)
    
    class OutputTranscriptTracker(FrameProcessor):
        """Tracks outgoing TTS responses from the bot"""
        def __init__(self, bot_name: str, add_func, transcript_ref, goal_detector=None, goal_description=None, stop_signal_path=None):
            super().__init__()
            self.bot_name = bot_name
            self.add_func = add_func
            self.transcript_ref = transcript_ref  # Reference to transcript list
            self._llm_text_buffer = ""
            self._llm_first_token_seen_for_turn = set()
            self.goal_detector = goal_detector
            self.goal_description = goal_description
            self.stop_signal_path = stop_signal_path
            self.goal_met = False
            self.last_goal_check_turn = 0
            self.turn_count = 0
        
        async def process_frame(self, frame, direction):
            await super().process_frame(frame, direction)
            
            tracer = get_tracer()
            
            # Log LLM text frames for debugging and track first token
            if isinstance(frame, LLMTextFrame):
                text = getattr(frame, 'text', '')
                if text:
                    logger.info(f"🧠 LLM output: {text}")
                    self._llm_text_buffer += text
                    
                    # Track first LLM token (once per turn)
                    if tracer:
                        turn_id = tracer.current_turn_id
                        if turn_id and turn_id not in self._llm_first_token_seen_for_turn:
                            tracer.record_llm_first_token(text[:50] if len(text) > 50 else text)
                            self._llm_first_token_seen_for_turn.add(turn_id)
            
            if isinstance(frame, TTSTextFrame):
                text = getattr(frame, 'text', '')
                if text:
                    logger.info(f"🔊 TTS output: {text}")
                    self.add_func(self.bot_name, text, "response")
                    # Record TTS start
                    if tracer:
                        tracer.record_tts_start(text)
                    
                    # Check for goal after every few turns (to avoid too many API calls)
                    self.turn_count += 1
                    if self.goal_detector and self.turn_count >= self.last_goal_check_turn + 3:
                        try:
                            # Get recent conversation history
                            conversation_history = []
                            for entry in self.transcript_ref[-10:]:
                                conversation_history.append({
                                    "speaker": entry.get("speaker", "Unknown"),
                                    "message": entry.get("text", "")
                                })
                            
                            result = self.goal_detector.check_goal_met(
                                conversation_history,
                                self.goal_description
                            )
                            
                            if result.get("goal_met", False) and result.get("confidence", 0) > 0.7:
                                self.goal_met = True
                                logger.info(f"✅ Goal met! Confidence: {result.get('confidence', 0):.2f}")
                                logger.info(f"Reasoning: {result.get('reasoning', '')}")
                                # Signal to stop by creating a stop file
                                if self.stop_signal_path:
                                    self.stop_signal_path.parent.mkdir(parents=True, exist_ok=True)
                                    with open(self.stop_signal_path, 'w') as f:
                                        json.dump({"reason": "goal_met", "result": result}, f)
                            
                            self.last_goal_check_turn = self.turn_count
                        except Exception as e:
                            logger.debug(f"Goal check error: {e}")
            
            await self.push_frame(frame, direction)
    
    class DebugProcessor(FrameProcessor):
        """Debug processor to log all frames passing through and track metrics"""
        def __init__(self, label: str):
            super().__init__()
            self._label = label
            self._tts_first_token_seen = False
            self._llm_response_started = False
        
        async def process_frame(self, frame, direction):
            await super().process_frame(frame, direction)
            
            tracer = get_tracer()
            frame_type = type(frame).__name__
            
            # Track metrics based on frame type and position in pipeline
            if tracer:
                if self._label == "after_llm":
                    # Track LLM response start
                    if frame_type == "LLMFullResponseStartFrame" and not self._llm_response_started:
                        tracer.record_llm_start()
                        self._llm_response_started = True
                    # Track LLM response end
                    elif frame_type == "LLMFullResponseEndFrame":
                        # Get the accumulated response text from output_tracker
                        if hasattr(output_tracker, '_llm_text_buffer'):
                            response_text = output_tracker._llm_text_buffer
                            tracer.record_llm_end(response_text)
                            # Reset buffer for next turn
                            output_tracker._llm_text_buffer = ""
                        else:
                            tracer.record_llm_end("")
                        self._llm_response_started = False
                        # Reset first token tracking when turn ends
                        if hasattr(output_tracker, '_llm_first_token_seen_for_turn'):
                            turn_id = tracer.current_turn_id
                            if turn_id and turn_id in output_tracker._llm_first_token_seen_for_turn:
                                output_tracker._llm_first_token_seen_for_turn.remove(turn_id)
                
                elif self._label == "after_tts":
                    # Track TTS first token
                    if frame_type in ["AudioRawFrame", "TTSStartedFrame"] and not self._tts_first_token_seen:
                        tracer.record_tts_first_token()
                        self._tts_first_token_seen = True
                    elif frame_type == "TTSStoppedFrame":
                        tracer.record_tts_end()
                        self._tts_first_token_seen = False  # Reset for next turn
            
            # Log important frame types
            if frame_type not in ['AudioRawFrame', 'StartFrame', 'EndFrame']:
                logger.debug(f"🔍 [{self._label}] Frame: {frame_type}")
            
            await self.push_frame(frame, direction)
    
    input_tracker = InputTranscriptTracker(bot_name, add_to_transcript)
    output_tracker = OutputTranscriptTracker(
        bot_name, 
        add_to_transcript,
        transcript,  # Pass transcript reference
        goal_detector=goal_detector,
        goal_description=goal_description,
        stop_signal_path=stop_signal_path
    )

    # 7. Setup Event Handlers for Debugging and Tracing
    @transport.event_handler("on_participant_connected")
    async def on_participant_connected(transport, participant_sid):
        # Note: participant_sid is a string (participant SID), not a participant object
        logger.info(f"👤 PARTICIPANT JOINED: {participant_sid}")
    
    @transport.event_handler("on_participant_disconnected")
    async def on_participant_disconnected(transport, participant_sid):
        # Note: participant_sid is a string (participant SID), not a participant object
        logger.info(f"👋 PARTICIPANT LEFT: {participant_sid}")
    
    @transport.event_handler("on_audio_track_subscribed")
    async def on_audio_track_subscribed(transport, participant_sid):
        # Note: participant_sid is a string (participant SID), not a participant object
        logger.info(f"🎙️ AUDIO TRACK SUBSCRIBED from: {participant_sid}")
    
    # Add VAD event handlers for tracing (if available)
    try:
        if vad_analyzer and hasattr(vad_analyzer, 'event_handler'):
            @vad_analyzer.event_handler("on_speech_started")
            async def on_speech_started():
                logger.debug("🎤 VAD: Speech started")
                tracer = get_tracer()
                if tracer:
                    tracer.start_turn()
                    tracer.record_vad_start()
                    tracer.record_stt_start()
            
            @vad_analyzer.event_handler("on_speech_stopped")
            async def on_speech_stopped():
                logger.debug("🔇 VAD: Speech stopped")
                tracer = get_tracer()
                if tracer:
                    tracer.record_vad_end()
    except Exception as e:
        logger.debug(f"Could not attach VAD event handlers: {e}")
    
    # Custom processor to track audio output start
    class AudioOutputTracker(FrameProcessor):
        """Tracks when audio output starts"""
        def __init__(self):
            super().__init__()
            self._audio_out_recorded_for_turn = {}
        
        async def process_frame(self, frame, direction):
            await super().process_frame(frame, direction)
            tracer = get_tracer()
            if tracer:
                from pipecat.frames.frames import AudioRawFrame, TTSStartedFrame
                if isinstance(frame, (AudioRawFrame, TTSStartedFrame)):
                    # Get current turn ID
                    turn_id = tracer.current_turn_id if tracer else None
                    if turn_id and turn_id not in self._audio_out_recorded_for_turn:
                        tracer.record_audio_out_start()
                        self._audio_out_recorded_for_turn[turn_id] = True
            await self.push_frame(frame, direction)
    
    # Track turn boundaries and reset state
    class TurnTracker(FrameProcessor):
        """Tracks turn boundaries and manages turn state"""
        def __init__(self, audio_tracker):
            super().__init__()
            self.audio_tracker = audio_tracker
        
        async def process_frame(self, frame, direction):
            await super().process_frame(frame, direction)
            tracer = get_tracer()
            if tracer:
                from pipecat.frames.frames import TranscriptionFrame
                if isinstance(frame, TranscriptionFrame):
                    # New turn started when we receive transcription from another participant
                    user_id = getattr(frame, 'user_id', 'Unknown')
                    if user_id != bot_name:
                        # End previous turn if any
                        if tracer.current_turn_id:
                            tracer.end_turn()
                        # Start new turn
                        tracer.start_turn()
                        # Reset audio output tracking
                        if hasattr(self.audio_tracker, '_audio_out_recorded_for_turn'):
                            self.audio_tracker._audio_out_recorded_for_turn.clear()
            await self.push_frame(frame, direction)
    
    # Create remaining processors (after class definitions)
    audio_output_tracker = AudioOutputTracker()
    turn_tracker = TurnTracker(audio_output_tracker)
    
    # 8. Build Pipeline
    pipeline = Pipeline([
        transport.input(),           # Listen for audio from room
        DebugProcessor("after_input"),
        turn_tracker,                # Track turn boundaries
        stt,                         # Transcribe audio to text
        DebugProcessor("after_stt"),
        input_tracker,               # Track incoming transcriptions
        context_aggregator.user(),   # Add user message to context
        DebugProcessor("after_user_ctx"),
        llm,                         # Generate response
        DebugProcessor("after_llm"),
        output_tracker,              # Track outgoing responses
        tts,                         # Convert response to audio
        DebugProcessor("after_tts"),
        audio_output_tracker,        # Track audio output start
        transport.output(),          # Send audio to room
        context_aggregator.assistant()  # Add assistant message to context
    ])
    logger.info("✅ Pipeline built successfully")
    
    # 9. Run with time limit
    # Note: VAD and SmartTurnAnalyzer handle turn detection at the transport level
    # When allow_interruptions=False, SmartTurnAnalyzer detects when the other bot finishes speaking
    # When allow_interruptions=True, VAD still detects speech but allows overlapping responses
    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=allow_interruptions))
    runner = PipelineRunner()
    
    logger.info(f"🚀 Bot '{bot_name}' is now running and listening...")
    logger.info("=" * 60)
    
    # If bot should speak first, trigger initial response after pipeline starts
    async def trigger_initial_message():
        if should_speak_first:
            # Wait for pipeline and transport to fully initialize
            # Give it time to connect and receive StartFrame
            logger.info(f"⏳ Waiting for pipeline to initialize before {bot_name} starts conversation...")
            
            # Try multiple times with increasing delays to ensure pipeline is ready
            max_attempts = 15
            for attempt in range(max_attempts):
                await asyncio.sleep(2)  # Wait 2 seconds between attempts
                
                try:
                    logger.info(f"🎤 {bot_name} attempting to initiate conversation (attempt {attempt + 1}/{max_attempts})...")
                    
                    # Use LLMMessagesAppendFrame with run_llm=True to trigger the LLM
                    # This is the correct way to add a message and immediately trigger a response
                    from pipecat.frames.frames import LLMMessagesAppendFrame
                    
                    # Create a user message that will trigger the LLM to respond
                    # The LLM will see this as the first user message and respond accordingly
                    trigger_message = "Hello! I'm ready to start our conversation."
                    
                    # Push the frame to add message to context and trigger LLM response
                    await task.queue_frames([
                        LLMMessagesAppendFrame(
                            messages=[{"role": "user", "content": trigger_message}],
                            run_llm=True  # This is critical - it triggers the LLM to respond
                        )
                    ])
                    
                    logger.info(f"✅ Initial trigger message queued successfully: {trigger_message}")
                    add_to_transcript("System", f"Triggered initial message: {trigger_message}", "initial_trigger")
                    return  # Success - exit the retry loop
                    
                except Exception as e:
                    if attempt < max_attempts - 1:
                        logger.debug(f"Attempt {attempt + 1} failed, will retry... Error: {str(e)}")
                    else:
                        logger.error(f"❌ Failed to trigger initial message after {max_attempts} attempts: {e}")
                        import traceback
                        logger.error(traceback.format_exc())
    
    # Start initial message trigger in background
    if should_speak_first:
        asyncio.create_task(trigger_initial_message())
    
    # Run with timeout if max_time is set, and check for stop signal
    stop_requested = False
    start_run_time = time.time()
    
    async def check_stop_conditions():
        """Background task to check for stop conditions"""
        nonlocal stop_requested
        while not stop_requested:
            await asyncio.sleep(2)  # Check every 2 seconds
            
            # Check for stop signal file
            if stop_signal_path and stop_signal_path.exists():
                logger.info("🛑 Stop signal detected. Stopping simulation.")
                stop_requested = True
                if hasattr(runner, 'cancel'):
                    runner.cancel()
                break
            
            # Check if goal was met
            if output_tracker.goal_met:
                logger.info("✅ Conversation goal achieved. Stopping simulation.")
                stop_requested = True
                if hasattr(runner, 'cancel'):
                    runner.cancel()
                break
            
            # Check time limit
            if max_time and (time.time() - start_run_time) >= max_time:
                logger.info(f"⏱️  Time limit of {max_time} seconds reached. Stopping simulation.")
                stop_requested = True
                if hasattr(runner, 'cancel'):
                    runner.cancel()
                break
    
    try:
        # Start background checker
        checker_task = asyncio.create_task(check_stop_conditions())
        
        # Run the main task
        if max_time:
            try:
                await asyncio.wait_for(runner.run(task), timeout=max_time)
            except asyncio.TimeoutError:
                logger.info(f"⏱️  Time limit of {max_time} seconds reached. Stopping simulation.")
        else:
            await runner.run(task)
        
        # Cancel checker
        checker_task.cancel()
        try:
            await checker_task
        except asyncio.CancelledError:
            pass
            
    except asyncio.TimeoutError:
        logger.info(f"⏱️  Time limit of {max_time} seconds reached. Stopping simulation.")
    except KeyboardInterrupt:
        logger.info("🛑 Simulation interrupted by user.")
    except Exception as e:
        logger.error(f"Error during simulation: {e}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        # Save tracing log
        tracer = get_tracer()
        if tracer:
            tracer.save_log()
            summary = tracer.get_summary()
            logger.info("=" * 60)
            logger.info("📊 TRACING SUMMARY")
            logger.info("=" * 60)
            logger.info(f"Total Events: {summary['total_events']}")
            logger.info(f"Total Turns: {summary['total_turns']}")
            if summary['first_llm_token_timestamp']:
                logger.info(f"First LLM Token: {datetime.fromtimestamp(summary['first_llm_token_timestamp']).strftime('%Y-%m-%d %H:%M:%S.%f')}")
            if summary['first_spoken_token_timestamp']:
                logger.info(f"First Spoken Token: {datetime.fromtimestamp(summary['first_spoken_token_timestamp']).strftime('%Y-%m-%d %H:%M:%S.%f')}")
            avg = summary['average_latencies']
            if avg['vad_latency']:
                logger.info(f"Avg VAD Latency: {avg['vad_latency']:.3f}s")
            if avg['stt_latency']:
                logger.info(f"Avg STT Latency: {avg['stt_latency']:.3f}s")
            if avg['llm_latency']:
                logger.info(f"Avg LLM Latency: {avg['llm_latency']:.3f}s")
            if avg['tts_latency']:
                logger.info(f"Avg TTS Latency: {avg['tts_latency']:.3f}s")
            if avg['end_to_end_latency']:
                logger.info(f"Avg End-to-End Latency: {avg['end_to_end_latency']:.3f}s")
            logger.info("=" * 60)
        
        # Save transcript in TXT format
        if transcript_file and transcript:
            transcript_dir = Path(transcript_file).parent
            transcript_dir.mkdir(parents=True, exist_ok=True)
            with open(transcript_file, 'w', encoding='utf-8') as f:
                f.write("=" * 80 + "\n")
                f.write(f"CONVERSATION TRANSCRIPT\n")
                f.write(f"Bot: {bot_name}\n")
                f.write(f"Start Time: {datetime.fromtimestamp(start_time).strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Duration: {time.time() - start_time:.2f} seconds\n")
                f.write("=" * 80 + "\n\n")
                for entry in transcript:
                    f.write(f"[{entry['timestamp']}] {entry['speaker']} ({entry['type']}): {entry['text']}\n")
            logger.info(f"💾 Transcript (TXT) saved to {transcript_file}")
        
        # Save transcript in JSON format
        if transcript_json_file and transcript:
            import json
            transcript_dir = Path(transcript_json_file).parent
            transcript_dir.mkdir(parents=True, exist_ok=True)
            
            json_data = {
                "bot_name": bot_name,
                "start_time": datetime.fromtimestamp(start_time).strftime('%Y-%m-%d %H:%M:%S'),
                "end_time": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "duration_seconds": round(time.time() - start_time, 2),
                "entries": transcript
            }
            
            with open(transcript_json_file, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=2, ensure_ascii=False)
            logger.info(f"💾 Transcript (JSON) saved to {transcript_json_file}")
        
        # Cleanup
        if log_file:
            logger.removeHandler(file_handler)
        logger.removeHandler(console_handler)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", type=str, required=True)
    parser.add_argument("--role", type=str, default="You are chatting with another AI.")
    parser.add_argument("--log-file", type=str, default=None)
    parser.add_argument("--transcript-file", type=str, default=None)
    parser.add_argument("--transcript-json-file", type=str, default=None)
    parser.add_argument("--max-time", type=int, default=None)
    parser.add_argument("--speak-first", action="store_true", default=False)
    parser.add_argument("--tracing-log-file", type=str, default=None,
                        help="Path to JSON file for tracing metrics (default: {bot_name}_tracing.json in log directory)")
    parser.add_argument("--goal-description", type=str, default=None,
                        help="Description of conversation goal for automatic termination")
    parser.add_argument("--stop-signal-file", type=str, default=None,
                        help="Path to file that signals stop when created")
    parser.add_argument("--room-name", type=str, default=None,
                        help="LiveKit room name (default: testingsims)")
    # Mutually exclusive group for interruption handling
    interruption_group = parser.add_mutually_exclusive_group()
    interruption_group.add_argument("--allow-interruptions", action="store_true", dest="allow_interruptions", 
                                     help="Allow bots to interrupt each other (default)")
    interruption_group.add_argument("--no-interruptions", action="store_false", dest="allow_interruptions",
                                     help="Disable interruptions - bots wait for each other")
    parser.set_defaults(allow_interruptions=True)
    args = parser.parse_args()

    asyncio.run(main(
        args.name, 
        args.role, 
        log_file=args.log_file,
        transcript_file=args.transcript_file,
        transcript_json_file=args.transcript_json_file,
        max_time=args.max_time,
        should_speak_first=args.speak_first,
        allow_interruptions=args.allow_interruptions,
        tracing_log_file=args.tracing_log_file,
        goal_description=args.goal_description,
        stop_signal_file=args.stop_signal_file,
        room_name=args.room_name
    ))
