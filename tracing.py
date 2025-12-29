"""
Tracing module for bot-to-bot simulation metrics tracking.

This module provides comprehensive tracing capabilities using LangSmith (if available)
and structured JSON logging for metrics analysis.

Metrics tracked:
- Timestamp of first LLM token
- Timestamp of first spoken token
- VAD latency
- STT latency
- TTS latency
- End-to-end latency
- Turn-taking metrics
"""

import json
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Any, List
from dataclasses import dataclass, asdict
from enum import Enum
import threading

# Try to import LangSmith, but make it optional
try:
    from langsmith import traceable, Client
    LANGSMITH_AVAILABLE = True
except ImportError:
    LANGSMITH_AVAILABLE = False
    # Create a dummy decorator if LangSmith is not available
    def traceable(*args, **kwargs):
        def decorator(func):
            return func
        return decorator


class MetricType(str, Enum):
    """Types of metrics being tracked"""
    VAD_START = "vad_start"
    VAD_END = "vad_end"
    STT_START = "stt_start"
    STT_END = "stt_end"
    LLM_START = "llm_start"
    LLM_FIRST_TOKEN = "llm_first_token"
    LLM_END = "llm_end"
    TTS_START = "tts_start"
    TTS_FIRST_TOKEN = "tts_first_token"
    TTS_END = "tts_end"
    AUDIO_OUT_START = "audio_out_start"
    TURN_START = "turn_start"
    TURN_END = "turn_end"


@dataclass
class MetricEvent:
    """Represents a single metric event"""
    event_type: str
    timestamp: float
    bot_name: str
    metadata: Dict[str, Any]
    turn_id: Optional[str] = None


@dataclass
class LatencyMetrics:
    """Calculated latency metrics for a turn"""
    turn_id: str
    bot_name: str
    vad_latency: Optional[float] = None
    stt_latency: Optional[float] = None
    llm_latency: Optional[float] = None
    llm_first_token_latency: Optional[float] = None
    tts_latency: Optional[float] = None
    tts_first_token_latency: Optional[float] = None
    end_to_end_latency: Optional[float] = None
    turn_duration: Optional[float] = None
    first_llm_token_timestamp: Optional[float] = None
    first_spoken_token_timestamp: Optional[float] = None


class SimulationTracer:
    """
    Main tracing class for tracking simulation metrics.
    
    Tracks all key events in the pipeline and calculates latencies.
    Logs to structured JSON files following standard practices.
    """
    
    def __init__(self, bot_name: str, log_file: Optional[str] = None):
        """
        Initialize the tracer.
        
        Args:
            bot_name: Name of the bot being traced
            log_file: Path to JSON log file for metrics (optional)
        """
        self.bot_name = bot_name
        self.log_file = log_file
        self.events: List[MetricEvent] = []
        self.current_turn_id: Optional[str] = None
        self.turn_counter = 0
        self.lock = threading.Lock()
        
        # Track first occurrences
        self.first_llm_token_timestamp: Optional[float] = None
        self.first_spoken_token_timestamp: Optional[float] = None
        
        # Track current turn events
        self.turn_events: Dict[str, Dict[str, float]] = {}
        
        # Setup logger
        self.logger = logging.getLogger(f"tracing.{bot_name}")
        
        # Initialize LangSmith client if available
        self.langsmith_client = None
        if LANGSMITH_AVAILABLE:
            try:
                self.langsmith_client = Client()
                self.logger.info("✅ LangSmith client initialized")
            except Exception as e:
                self.logger.warning(f"⚠️ LangSmith available but client initialization failed: {e}")
    
    def _get_turn_id(self) -> str:
        """Generate a unique turn ID"""
        self.turn_counter += 1
        return f"turn_{self.turn_counter}_{int(time.time() * 1000)}"
    
    def _record_event(self, event_type: str, metadata: Dict[str, Any] = None, turn_id: Optional[str] = None):
        """Record a metric event"""
        with self.lock:
            if turn_id is None:
                turn_id = self.current_turn_id
            
            if turn_id is None:
                turn_id = self._get_turn_id()
                self.current_turn_id = turn_id
            
            event = MetricEvent(
                event_type=event_type,
                timestamp=time.time(),
                bot_name=self.bot_name,
                metadata=metadata or {},
                turn_id=turn_id
            )
            
            self.events.append(event)
            
            # Track in turn_events for latency calculation
            if turn_id not in self.turn_events:
                self.turn_events[turn_id] = {}
            self.turn_events[turn_id][event_type] = event.timestamp
            
            # Track first occurrences
            if event_type == MetricType.LLM_FIRST_TOKEN and self.first_llm_token_timestamp is None:
                self.first_llm_token_timestamp = event.timestamp
                self.logger.info(f"🎯 First LLM token timestamp: {event.timestamp}")
            
            if event_type == MetricType.TTS_FIRST_TOKEN and self.first_spoken_token_timestamp is None:
                self.first_spoken_token_timestamp = event.timestamp
                self.logger.info(f"🎯 First spoken token timestamp: {event.timestamp}")
            
            self.logger.debug(f"📊 Event: {event_type} | Turn: {turn_id} | Time: {event.timestamp:.4f}")
    
    def start_turn(self) -> str:
        """Mark the start of a new turn"""
        turn_id = self._get_turn_id()
        self.current_turn_id = turn_id
        self._record_event(MetricType.TURN_START, turn_id=turn_id)
        return turn_id
    
    def end_turn(self):
        """Mark the end of the current turn"""
        if self.current_turn_id:
            self._record_event(MetricType.TURN_END, turn_id=self.current_turn_id)
            # Calculate and log latencies for this turn
            self._calculate_turn_metrics(self.current_turn_id)
            self.current_turn_id = None
    
    def record_vad_start(self, metadata: Dict[str, Any] = None):
        """Record VAD speech start"""
        self._record_event(MetricType.VAD_START, metadata)
    
    def record_vad_end(self, metadata: Dict[str, Any] = None):
        """Record VAD speech end"""
        self._record_event(MetricType.VAD_END, metadata)
    
    def record_stt_start(self, metadata: Dict[str, Any] = None):
        """Record STT processing start"""
        self._record_event(MetricType.STT_START, metadata)
    
    def record_stt_end(self, transcript: str, metadata: Dict[str, Any] = None):
        """Record STT processing end"""
        md = metadata or {}
        md['transcript'] = transcript
        self._record_event(MetricType.STT_END, md)
    
    def record_llm_start(self, metadata: Dict[str, Any] = None):
        """Record LLM processing start"""
        self._record_event(MetricType.LLM_START, metadata)
    
    def record_llm_first_token(self, token: str, metadata: Dict[str, Any] = None):
        """Record first LLM token received"""
        md = metadata or {}
        md['first_token'] = token
        self._record_event(MetricType.LLM_FIRST_TOKEN, md)
    
    def record_llm_end(self, response: str, metadata: Dict[str, Any] = None):
        """Record LLM processing end"""
        md = metadata or {}
        md['response_length'] = len(response)
        self._record_event(MetricType.LLM_END, md)
    
    def record_tts_start(self, text: str, metadata: Dict[str, Any] = None):
        """Record TTS processing start"""
        md = metadata or {}
        md['text'] = text
        self._record_event(MetricType.TTS_START, md)
    
    def record_tts_first_token(self, metadata: Dict[str, Any] = None):
        """Record first TTS audio token"""
        self._record_event(MetricType.TTS_FIRST_TOKEN, metadata)
    
    def record_tts_end(self, metadata: Dict[str, Any] = None):
        """Record TTS processing end"""
        self._record_event(MetricType.TTS_END, metadata)
    
    def record_audio_out_start(self, metadata: Dict[str, Any] = None):
        """Record audio output start"""
        self._record_event(MetricType.AUDIO_OUT_START, metadata)
    
    def _calculate_turn_metrics(self, turn_id: str) -> Optional[LatencyMetrics]:
        """Calculate latency metrics for a completed turn"""
        if turn_id not in self.turn_events:
            return None
        
        events = self.turn_events[turn_id]
        metrics = LatencyMetrics(turn_id=turn_id, bot_name=self.bot_name)
        
        # Calculate VAD latency (if both start and end are present)
        if MetricType.VAD_START in events and MetricType.VAD_END in events:
            metrics.vad_latency = events[MetricType.VAD_END] - events[MetricType.VAD_START]
        
        # Calculate STT latency
        if MetricType.STT_START in events and MetricType.STT_END in events:
            metrics.stt_latency = events[MetricType.STT_END] - events[MetricType.STT_START]
        
        # Calculate LLM latency
        if MetricType.LLM_START in events and MetricType.LLM_END in events:
            metrics.llm_latency = events[MetricType.LLM_END] - events[MetricType.LLM_START]
        
        # Calculate LLM first token latency
        if MetricType.LLM_START in events and MetricType.LLM_FIRST_TOKEN in events:
            metrics.llm_first_token_latency = events[MetricType.LLM_FIRST_TOKEN] - events[MetricType.LLM_START]
            metrics.first_llm_token_timestamp = events[MetricType.LLM_FIRST_TOKEN]
        
        # Calculate TTS latency
        if MetricType.TTS_START in events and MetricType.TTS_END in events:
            metrics.tts_latency = events[MetricType.TTS_END] - events[MetricType.TTS_START]
        
        # Calculate TTS first token latency
        if MetricType.TTS_START in events and MetricType.TTS_FIRST_TOKEN in events:
            metrics.tts_first_token_latency = events[MetricType.TTS_FIRST_TOKEN] - events[MetricType.TTS_START]
            metrics.first_spoken_token_timestamp = events[MetricType.TTS_FIRST_TOKEN]
        
        # Calculate end-to-end latency (from VAD start to audio out)
        if MetricType.VAD_START in events and MetricType.AUDIO_OUT_START in events:
            metrics.end_to_end_latency = events[MetricType.AUDIO_OUT_START] - events[MetricType.VAD_START]
        
        # Calculate turn duration
        if MetricType.TURN_START in events and MetricType.TURN_END in events:
            metrics.turn_duration = events[MetricType.TURN_END] - events[MetricType.TURN_START]
        
        # Log the metrics
        self.logger.info(f"📈 Turn {turn_id} metrics: {json.dumps(asdict(metrics), indent=2, default=str)}")
        
        return metrics
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of all metrics"""
        with self.lock:
            # Calculate metrics for all completed turns
            all_metrics = []
            for turn_id in self.turn_events:
                if MetricType.TURN_END in self.turn_events[turn_id]:
                    metrics = self._calculate_turn_metrics(turn_id)
                    if metrics:
                        all_metrics.append(asdict(metrics))
            
            # Calculate aggregate statistics
            if all_metrics:
                avg_vad = sum(m.get('vad_latency', 0) or 0 for m in all_metrics) / len([m for m in all_metrics if m.get('vad_latency')])
                avg_stt = sum(m.get('stt_latency', 0) or 0 for m in all_metrics) / len([m for m in all_metrics if m.get('stt_latency')])
                avg_llm = sum(m.get('llm_latency', 0) or 0 for m in all_metrics) / len([m for m in all_metrics if m.get('llm_latency')])
                avg_tts = sum(m.get('tts_latency', 0) or 0 for m in all_metrics) / len([m for m in all_metrics if m.get('tts_latency')])
                avg_e2e = sum(m.get('end_to_end_latency', 0) or 0 for m in all_metrics) / len([m for m in all_metrics if m.get('end_to_end_latency')])
            else:
                avg_vad = avg_stt = avg_llm = avg_tts = avg_e2e = None
            
            return {
                "bot_name": self.bot_name,
                "total_events": len(self.events),
                "total_turns": len([t for t in self.turn_events if MetricType.TURN_END in self.turn_events[t]]),
                "first_llm_token_timestamp": self.first_llm_token_timestamp,
                "first_spoken_token_timestamp": self.first_spoken_token_timestamp,
                "average_latencies": {
                    "vad_latency": avg_vad,
                    "stt_latency": avg_stt,
                    "llm_latency": avg_llm,
                    "tts_latency": avg_tts,
                    "end_to_end_latency": avg_e2e
                },
                "turn_metrics": all_metrics
            }
    
    def save_log(self):
        """Save all events and metrics to JSON log file"""
        if not self.log_file:
            return
        
        try:
            log_path = Path(self.log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)
            
            summary = self.get_summary()
            
            # Create comprehensive log structure
            log_data = {
                "bot_name": self.bot_name,
                "log_timestamp": datetime.now().isoformat(),
                "langsmith_available": LANGSMITH_AVAILABLE,
                "first_llm_token_timestamp": self.first_llm_token_timestamp,
                "first_spoken_token_timestamp": self.first_spoken_token_timestamp,
                "summary": summary,
                "events": [asdict(event) for event in self.events]
            }
            
            with open(log_path, 'w', encoding='utf-8') as f:
                json.dump(log_data, f, indent=2, ensure_ascii=False, default=str)
            
            self.logger.info(f"💾 Tracing log saved to {log_path}")
            
        except Exception as e:
            self.logger.error(f"❌ Error saving tracing log: {e}")


# Global tracer instance (will be set per bot)
_global_tracer: Optional[SimulationTracer] = None


def get_tracer() -> Optional[SimulationTracer]:
    """Get the global tracer instance"""
    return _global_tracer


def set_tracer(tracer: SimulationTracer):
    """Set the global tracer instance"""
    global _global_tracer
    _global_tracer = tracer

