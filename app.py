import streamlit as st
import subprocess
import os
import time
import json
import random
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
import threading
import signal
import sys

# Import Simple LLM Judge
try:
    from llm_judge import SimpleLLMJudge, EvaluationCriterion
    LLM_JUDGE_AVAILABLE = True
except ImportError:
    LLM_JUDGE_AVAILABLE = False
    # Don't show warning here, will show in sidebar if needed

# Page config
st.set_page_config(
    page_title="Bot-to-Bot Simulation",
    page_icon="🤖",
    layout="wide"
)

# Title
st.title("🤖 Bot-to-Bot Simulation Control Panel")

# Initialize session state
if 'simulation_running' not in st.session_state:
    st.session_state.simulation_running = False
if 'processes' not in st.session_state:
    st.session_state.processes = []
if 'simulation_id' not in st.session_state:
    st.session_state.simulation_id = None
if 'allow_interruptions' not in st.session_state:
    st.session_state.allow_interruptions = True  # Default: allow interruptions
if 'simulation_folder' not in st.session_state:
    st.session_state.simulation_folder = None
if 'bot1_transcript_json' not in st.session_state:
    st.session_state.bot1_transcript_json = None
if 'bot2_transcript_json' not in st.session_state:
    st.session_state.bot2_transcript_json = None
if 'unified_transcript_path' not in st.session_state:
    st.session_state.unified_transcript_path = None
if 'evaluation_result' not in st.session_state:
    st.session_state.evaluation_result = None
if 'evaluation_path' not in st.session_state:
    st.session_state.evaluation_path = None
if 'simulation_start_time' not in st.session_state:
    st.session_state.simulation_start_time = None
if 'stop_signal_files' not in st.session_state:
    st.session_state.stop_signal_files = []

# Fixed system prompt for Bot 1 (Ira) - Personal Voice AI Assistant for Indian Customers
BOT1_IRA_SYSTEM_PROMPT = """You are Ira, a personal voice AI assistant designed specifically for Indian customers. You are warm, friendly, and culturally aware. You understand Indian contexts, languages (Hindi, English, and Hinglish), cultural nuances, and common Indian scenarios like UPI payments, cricket, local services, and family dynamics. You speak naturally, use appropriate Indian terms of address (like "beta", "ji", "aap"), and are patient and helpful. You keep your responses concise and conversational, suitable for voice interactions."""

# Load personas.json and select random system prompt for Bot 2
def load_random_persona_prompt(show_warnings=True):
    """Load a random system prompt from personas.json"""
    try:
        personas_path = Path(__file__).parent / "personas.json"
        if personas_path.exists():
            with open(personas_path, 'r', encoding='utf-8') as f:
                personas = json.load(f)
                if personas and len(personas) > 0:
                    selected_persona = random.choice(personas)
                    return selected_persona.get("system_prompt", "You are chatting with another AI.")
                else:
                    if show_warnings:
                        st.warning("⚠️ personas.json is empty. Using default prompt for Bot 2.")
                    return "You are chatting with another AI."
        else:
            if show_warnings:
                st.warning("⚠️ personas.json not found. Using default prompt for Bot 2.")
            return "You are chatting with another AI."
    except Exception as e:
        if show_warnings:
            st.error(f"❌ Error loading personas.json: {str(e)}")
        return "You are chatting with another AI."

# Initialize Bot 2 prompt in session state if not already set
if 'bot2_prompt' not in st.session_state:
    st.session_state.bot2_prompt = load_random_persona_prompt(show_warnings=False)

# Sidebar for configuration
with st.sidebar:
    st.header("⚙️ Configuration")
    
    # Display Bot System Prompts (read-only)
    st.subheader("Bot System Prompts")
    
    st.write("**Bot 1 (Ira) - Personal Voice AI Assistant**")
    st.info("🤖 Ira is a personal voice AI assistant for Indian customers. System prompt is fixed.")
    
    st.write("**Bot 2 - Random Persona**")
    # Show which persona was selected
    try:
        personas_path = Path(__file__).parent / "personas.json"
        if personas_path.exists():
            with open(personas_path, 'r', encoding='utf-8') as f:
                personas = json.load(f)
                # Find the current persona by matching system prompt
                current_persona = None
                for persona in personas:
                    if persona.get("system_prompt") == st.session_state.bot2_prompt:
                        current_persona = persona
                        break
                
                if current_persona:
                    st.info(f"📋 Selected: **{current_persona.get('persona_name', 'Unknown')}** - {current_persona.get('scenario_name', 'No scenario')}")
                else:
                    st.info("📋 Random persona selected from personas.json")
        else:
            st.warning("⚠️ personas.json not found")
    except Exception as e:
        st.warning(f"⚠️ Could not load persona info: {str(e)}")
    
    # Button to refresh Bot 2 persona
    if st.button("🔄 Select New Random Persona for Bot 2", type="secondary"):
        st.session_state.bot2_prompt = load_random_persona_prompt()
        st.rerun()
    
    st.divider()
    
    # Turn-Taking Settings
    st.subheader("🎙️ Turn-Taking")
    allow_interruptions = st.toggle(
        "Allow Interruptions",
        value=st.session_state.allow_interruptions,
        help="When OFF, bots use VAD + SmartTurnAnalyzer to detect when the other bot finishes speaking before responding. When ON, bots can interrupt each other.",
        key="interruptions_toggle"
    )
    st.session_state.allow_interruptions = allow_interruptions
    
    if allow_interruptions:
        st.caption("⚡ Bots can interrupt each other (VAD enabled for speech detection)")
    else:
        st.caption("🔇 Bots wait for turns (VAD + SmartTurnAnalyzer for end-of-turn detection)")
    
    st.divider()
    
    # Goal description
    goal_description = st.text_area(
        "Conversation Goal (Optional)",
        height=80,
        help="Describe the goal of the conversation. The LLM will automatically end the simulation when this goal is met.",
        key="goal_description"
    )
    
    st.divider()
    
    # Max time setting
    max_time = st.number_input(
        "Maximum Simulation Time (seconds)",
        min_value=10,
        max_value=3600,
        value=300,
        step=10,
        help="Fallback time limit. Simulation will stop if goal is met earlier, or at this time limit."
    )
    
    st.divider()
    
    # Output directory
    output_dir = st.text_input(
        "Output Directory",
        value="simulation_outputs",
        help="Directory where log and transcript files will be saved"
    )
    
    st.divider()
    
    # LLM Judge Configuration
    if LLM_JUDGE_AVAILABLE:
        st.subheader("⚖️ LLM Judge")
        # Check if API key is in environment
        env_api_key = os.getenv("GOOGLE_API_KEY", "")
        if env_api_key:
            st.info("✅ GOOGLE_API_KEY found in environment (will be used if not entered above)")
        
        google_api_key = st.text_input(
            "Google Gemini API Key",
            type="password",
            help="API key for the LLM judge (stored in session only). Can also use GOOGLE_API_KEY from environment.",
            key="google_api_key"
        )
        
        # Use environment key if user hasn't entered one
        if not google_api_key and env_api_key:
            google_api_key = env_api_key
        
        judge_model = st.selectbox(
            "Judge Model",
            options=["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.5-flash-lite"],
            index=0,
            help="Gemini model to use for evaluation",
            key="judge_model"
        )
        
        st.write("**Evaluation Criteria**")
        st.caption("Add multiple criteria. Each criterion will be evaluated separately by the LLM judge.")
        
        # Initialize criteria list in session state
        if 'evaluation_criteria' not in st.session_state:
            st.session_state.evaluation_criteria = []
        
        # Display existing criteria
        criteria_to_remove = []
        for idx, criterion_data in enumerate(st.session_state.evaluation_criteria):
            with st.expander(f"📋 Criterion {idx + 1}: {criterion_data.get('name', 'Unnamed')}", expanded=True):
                col1, col2 = st.columns([10, 1])
                with col1:
                    criterion_name = st.text_input(
                        "Criterion Name",
                        value=criterion_data.get('name', ''),
                        key=f"criterion_name_{idx}",
                        help="Short name for this criterion"
                    )
                    
                    criterion_desc = st.text_area(
                        "Description",
                        value=criterion_data.get('description', ''),
                        height=80,
                        key=f"criterion_desc_{idx}",
                        help="Describe what you want to evaluate"
                    )
                    
                    scoring_type = st.selectbox(
                        "Scoring Type",
                        options=["scale", "boolean"],
                        index=0 if criterion_data.get('scoring_type', 'scale') == 'scale' else 1,
                        key=f"criterion_scoring_{idx}",
                        help="Scale: 0-10 points, Boolean: True/False"
                    )
                    
                    user_instructions = st.text_area(
                        "Point Allocation Instructions",
                        value=criterion_data.get('user_instructions', ''),
                        height=60,
                        key=f"criterion_instructions_{idx}",
                        help="Explain how points should be allocated (e.g., 'Give 8-10 for excellent, 4-7 for good, 0-3 for poor')"
                    )
                    
                    # Update criterion data in session state
                    st.session_state.evaluation_criteria[idx] = {
                        'name': criterion_name,
                        'description': criterion_desc,
                        'scoring_type': scoring_type,
                        'user_instructions': user_instructions
                    }
                
                with col2:
                    if st.button("🗑️", key=f"remove_{idx}", help="Remove this criterion"):
                        criteria_to_remove.append(idx)
        
        # Remove criteria (in reverse order to maintain indices)
        for idx in sorted(criteria_to_remove, reverse=True):
            st.session_state.evaluation_criteria.pop(idx)
        
        if criteria_to_remove:
            st.rerun()
        
        # Add new criterion button
        if st.button("➕ Add Criterion", type="secondary"):
            st.session_state.evaluation_criteria.append({
                'name': '',
                'description': '',
                'scoring_type': 'scale',
                'user_instructions': ''
            })
            st.rerun()
        
        if not google_api_key:
            st.info("💡 Enter Google Gemini API key to enable LLM Judge evaluation (or set GOOGLE_API_KEY env var)")
    else:
        st.warning("⚠️ LLM Judge not available. Install: pip install google-genai")

# Functions
def start_simulation(bot1_prompt, bot2_prompt, max_time, output_dir, allow_interruptions=True):
    """Start the simulation with both bots in separate processes"""
    try:
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Generate unique simulation ID
        sim_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        st.session_state.simulation_id = sim_id
        
        # Create a folder for this simulation
        sim_folder = output_path / f"simulation_{sim_id}"
        sim_folder.mkdir(parents=True, exist_ok=True)
        st.session_state.simulation_folder = str(sim_folder)
        
        # Create file paths - all within the simulation folder
        bot1_log = sim_folder / "bot1_Ira.log"
        bot1_transcript_txt = sim_folder / "bot1_Ira_transcript.txt"
        bot1_transcript_json = sim_folder / "bot1_Ira_transcript.json"
        bot1_tracing_log = sim_folder / "bot1_Ira_tracing.json"
        bot1_stop_signal = sim_folder / "bot1_stop_signal.json"
        bot2_log = sim_folder / "bot2_Chetan.log"
        bot2_transcript_txt = sim_folder / "bot2_Chetan_transcript.txt"
        bot2_transcript_json = sim_folder / "bot2_Chetan_transcript.json"
        bot2_tracing_log = sim_folder / "bot2_Chetan_tracing.json"
        bot2_stop_signal = sim_folder / "bot2_stop_signal.json"
        
        # Store stop signal file paths
        st.session_state.stop_signal_files = [str(bot1_stop_signal), str(bot2_stop_signal)]
        
        # Store paths for unified transcript generation
        st.session_state.bot1_transcript_json = str(bot1_transcript_json)
        st.session_state.bot2_transcript_json = str(bot2_transcript_json)
        st.session_state.unified_transcript_path = str(sim_folder / "unified_transcript.json")
        
        # Get the script directory
        script_dir = Path(__file__).parent
        simulation_script = script_dir / "simulation.py"
        
        # Get goal description from session state
        goal_desc = st.session_state.get("goal_description", "")
        
        # Normalize prompts: replace newlines with spaces to avoid command-line parsing issues
        bot1_prompt_normalized = bot1_prompt.replace('\n', ' ').replace('\r', ' ').strip()
        bot2_prompt_normalized = bot2_prompt.replace('\n', ' ').replace('\r', ' ').strip()
        
        # Start Bot 1 process (speaks first)
        bot1_cmd = [
            sys.executable,
            str(simulation_script),
            "--name", "Ira",
            "--role", bot1_prompt_normalized,
            "--log-file", str(bot1_log),
            "--transcript-file", str(bot1_transcript_txt),
            "--transcript-json-file", str(bot1_transcript_json),
            "--tracing-log-file", str(bot1_tracing_log),
            "--max-time", str(max_time),
            "--stop-signal-file", str(bot1_stop_signal),
            "--speak-first"
        ]
        
        # Add goal description if provided
        if goal_desc:
            goal_desc_normalized = goal_desc.replace('\n', ' ').replace('\r', ' ').strip()
            bot1_cmd.extend(["--goal-description", goal_desc_normalized])
        
        # Add interruption flag
        if allow_interruptions:
            bot1_cmd.append("--allow-interruptions")
        else:
            bot1_cmd.append("--no-interruptions")
        
        # Start Bot 2 process
        bot2_cmd = [
            sys.executable,
            str(simulation_script),
            "--name", "Chetan",
            "--role", bot2_prompt_normalized,
            "--log-file", str(bot2_log),
            "--transcript-file", str(bot2_transcript_txt),
            "--transcript-json-file", str(bot2_transcript_json),
            "--tracing-log-file", str(bot2_tracing_log),
            "--max-time", str(max_time),
            "--stop-signal-file", str(bot2_stop_signal)
        ]
        
        # Add goal description if provided
        if goal_desc:
            goal_desc_normalized = goal_desc.replace('\n', ' ').replace('\r', ' ').strip()
            bot2_cmd.extend(["--goal-description", goal_desc_normalized])
        
        # Add interruption flag
        if allow_interruptions:
            bot2_cmd.append("--allow-interruptions")
        else:
            bot2_cmd.append("--no-interruptions")
        
        # Start processes in separate terminals (Windows)
        if os.name == 'nt':  # Windows
            # Use subprocess.list2cmdline to properly quote arguments for Windows
            # This properly handles spaces and special characters in arguments
            bot1_cmd_str = subprocess.list2cmdline(bot1_cmd)
            bot2_cmd_str = subprocess.list2cmdline(bot2_cmd)
            
            # Create a dummy process object to track (Windows start doesn't return process)
            class DummyProcess:
                def __init__(self):
                    self.pid = None
                def poll(self):
                    return None  # Always running from our perspective
                def terminate(self):
                    pass  # Can't easily terminate separate windows
            
            bot1_process = DummyProcess()
            # Quote the command string to handle spaces properly
            subprocess.Popen(
                f'start "Bot 1" cmd /k "{bot1_cmd_str}"',
                shell=True
            )
            
            # Small delay to ensure bot1 starts first
            time.sleep(2)
            
            bot2_process = DummyProcess()
            # Quote the command string to handle spaces properly
            subprocess.Popen(
                f'start "Bot 2" cmd /k "{bot2_cmd_str}"',
                shell=True
            )
        else:  # Unix-like systems
            # Use xterm or gnome-terminal
            bot1_process = subprocess.Popen(
                ['xterm', '-e'] + bot1_cmd + [';', 'read'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            time.sleep(1)
            
            bot2_process = subprocess.Popen(
                ['xterm', '-e'] + bot2_cmd + [';', 'read'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        
        # Store process references
        st.session_state.processes = [bot1_process, bot2_process]
        st.session_state.simulation_running = True
        st.session_state.simulation_start_time = time.time()
        
        st.success(f"✅ Simulation started! ID: {sim_id}")
        st.info(f"📁 Outputs will be saved to: {sim_folder}")
        if allow_interruptions:
            st.info("⚡ Mode: Interruptions ENABLED - bots can speak over each other")
        else:
            st.success("🎙️ Mode: Turn-Taking ENABLED - bots will wait for each other")
        if goal_desc:
            st.info(f"🎯 Goal: {goal_desc}")
        
    except Exception as e:
        st.error(f"❌ Error starting simulation: {str(e)}")
        st.session_state.simulation_running = False

def stop_simulation():
    """Stop the simulation by creating stop signal files"""
    try:
        # Create stop signal files
        stop_files = st.session_state.get("stop_signal_files", [])
        created_count = 0
        
        for stop_file in stop_files:
            try:
                stop_path = Path(stop_file)
                stop_path.parent.mkdir(parents=True, exist_ok=True)
                with open(stop_path, 'w') as f:
                    json.dump({"reason": "user_requested", "timestamp": datetime.now().isoformat()}, f)
                created_count += 1
            except Exception as e:
                pass  # Ignore individual file errors
        
        # Mark as stopped
        st.session_state.simulation_running = False
        
        if created_count > 0:
            st.success(f"🛑 Stop signal sent to {created_count} bot(s). They will stop shortly.")
        else:
            st.warning("⚠️ Could not create stop signals. Try 'Kill Bot Terminals' button.")
        
        # Attempt to generate unified transcript automatically after a delay
        # (Give bots time to save their transcripts)
        time.sleep(2)
        success, message = generate_unified_transcript()
        if success:
            st.success(f"📊 {message}")
        else:
            st.info(f"ℹ️ Unified transcript: {message}")
        
    except Exception as e:
        st.error(f"❌ Error stopping simulation: {str(e)}")

def kill_bot_terminals():
    """Kill the bot terminal windows (but not the Streamlit terminal)"""
    try:
        if os.name == 'nt':  # Windows
            # Kill terminals by exact window title (Bot 1 and Bot 2)
            # Using exact titles to ensure we only kill the bot terminals, not Streamlit
            killed_count = 0
            
            try:
                # Kill Bot 1 terminal (exact title match)
                result1 = subprocess.run(
                    ['taskkill', '/F', '/FI', 'WINDOWTITLE eq Bot 1*'], 
                    capture_output=True, 
                    shell=True,
                    text=True,
                    timeout=5
                )
                if "SUCCESS" in result1.stdout.upper() or "SUCCESS" in result1.stderr.upper():
                    killed_count += 1
                    
            except subprocess.TimeoutExpired:
                pass
            except Exception as e:
                pass  # Ignore errors
            
            try:
                # Kill Bot 2 terminal (exact title match)
                result2 = subprocess.run(
                    ['taskkill', '/F', '/FI', 'WINDOWTITLE eq Bot 2*'], 
                    capture_output=True, 
                    shell=True,
                    text=True,
                    timeout=5
                )
                if "SUCCESS" in result2.stdout.upper() or "SUCCESS" in result2.stderr.upper():
                    killed_count += 1
                    
            except subprocess.TimeoutExpired:
                pass
            except Exception as e:
                pass  # Ignore errors
            
            if killed_count > 0:
                st.success(f"✅ Closed {killed_count} bot terminal window(s)")
            else:
                st.info("ℹ️ No bot terminal windows found to close (they may already be closed)")
                    
        else:  # Unix-like systems
            # Try to kill the processes by PID
            killed_count = 0
            for process in st.session_state.processes:
                try:
                    if hasattr(process, 'poll') and process.poll() is None:
                        if hasattr(process, 'terminate'):
                            process.terminate()
                            try:
                                process.wait(timeout=5)
                                killed_count += 1
                            except:
                                pass
                except:
                    pass
            
            if killed_count > 0:
                st.success(f"✅ Closed {killed_count} bot terminal(s)")
            else:
                st.info("ℹ️ No bot terminals found to close")
        
        # Clear process references
        st.session_state.processes = []
        
    except Exception as e:
        st.error(f"❌ Error killing bot terminals: {str(e)}")
        st.info("💡 You may need to close the terminal windows manually")

def generate_unified_transcript():
    """Generate a unified transcript from both bot JSON transcripts"""
    try:
        bot1_path = st.session_state.bot1_transcript_json
        bot2_path = st.session_state.bot2_transcript_json
        unified_path = st.session_state.unified_transcript_path
        
        if not bot1_path or not bot2_path or not unified_path:
            return False, "Missing transcript paths"
        
        # Check if both JSON files exist
        if not os.path.exists(bot1_path) or not os.path.exists(bot2_path):
            return False, "Bot transcript files not found yet"
        
        # Load both transcripts
        with open(bot1_path, 'r', encoding='utf-8') as f:
            bot1_data = json.load(f)
        
        with open(bot2_path, 'r', encoding='utf-8') as f:
            bot2_data = json.load(f)
        
        # Combine entries from both bots
        all_entries = []
        
        for entry in bot1_data.get("entries", []):
            all_entries.append({
                "timestamp": entry["timestamp"],
                "bot": bot1_data["bot_name"],
                "speaker": entry["speaker"],
                "message": entry["text"],
                "type": entry["type"]
            })
        
        for entry in bot2_data.get("entries", []):
            all_entries.append({
                "timestamp": entry["timestamp"],
                "bot": bot2_data["bot_name"],
                "speaker": entry["speaker"],
                "message": entry["text"],
                "type": entry["type"]
            })
        
        # Sort by timestamp
        all_entries.sort(key=lambda x: x["timestamp"])
        
        # Create unified transcript structure
        unified_data = {
            "simulation_id": st.session_state.simulation_id,
            "bot1_name": bot1_data["bot_name"],
            "bot2_name": bot2_data["bot_name"],
            "start_time": min(bot1_data.get("start_time", ""), bot2_data.get("start_time", "")),
            "end_time": max(bot1_data.get("end_time", ""), bot2_data.get("end_time", "")),
            "total_turns": len(all_entries),
            "conversation": all_entries
        }
        
        # Save unified transcript
        with open(unified_path, 'w', encoding='utf-8') as f:
            json.dump(unified_data, f, indent=2, ensure_ascii=False)
        
        # Also generate simplified transcript (Bot 1 and Bot 2 messages only, no timestamps)
        simplified_path = Path(unified_path).parent / "simplified_transcript.json"
        simplified_messages = []
        
        for entry in all_entries:
            # Only include actual conversation messages (transcription or response)
            if entry.get("type") in ["transcription", "response", "message"]:
                bot_name = entry.get("bot", "")
                message = entry.get("message", "")
                
                # Map to Bot 1 or Bot 2
                if bot_name == bot1_data["bot_name"]:
                    simplified_messages.append({
                        "bot": "Bot 1",
                        "message": message
                    })
                elif bot_name == bot2_data["bot_name"]:
                    simplified_messages.append({
                        "bot": "Bot 2",
                        "message": message
                    })
        
        simplified_data = {
            "simulation_id": st.session_state.simulation_id,
            "bot1_name": bot1_data["bot_name"],
            "bot2_name": bot2_data["bot_name"],
            "messages": simplified_messages
        }
        
        with open(simplified_path, 'w', encoding='utf-8') as f:
            json.dump(simplified_data, f, indent=2, ensure_ascii=False)
        
        return True, f"Unified transcript saved to {unified_path}. Simplified transcript saved to {simplified_path}"
        
    except Exception as e:
        return False, f"Error generating unified transcript: {str(e)}"


def run_llm_judge_evaluation(simulation_folder: str, api_key: str, model: str = "gemini-2.0-flash-exp", 
                            criteria: List[Dict[str, Any]] = None):
    """
    Run LLM Judge evaluation on a simulation with multiple criteria.
    
    Args:
        simulation_folder: Path to simulation folder
        api_key: Google Gemini API key
        model: Model to use for judging
        criteria: List of criterion dictionaries
        
    Returns:
        Tuple of (success, message, evaluation_results)
    """
    if not LLM_JUDGE_AVAILABLE:
        return False, "LLM Judge not available. Install: pip install google-genai", None
    
    if not api_key:
        return False, "Google Gemini API key is required", None
    
    if not criteria or len(criteria) == 0:
        return False, "At least one evaluation criterion is required", None
    
    try:
        # Check for simplified transcript
        simplified_path = Path(simulation_folder) / "simplified_transcript.json"
        if not simplified_path.exists():
            return False, "Simplified transcript not found. Generate unified transcript first.", None
        
        # Create output path
        output_path = Path(simulation_folder) / "eval_output.json"
        
        # Create judge and evaluate
        judge = SimpleLLMJudge(api_key=api_key, model=model)
        
        # Convert criteria dicts to EvaluationCriterion objects
        criterion_objects = []
        for c in criteria:
            if c.get('name') and c.get('description'):  # Only include criteria with name and description
                criterion_objects.append(EvaluationCriterion(
                    name=c['name'],
                    description=c['description'],
                    scoring_type=c.get('scoring_type', 'scale'),
                    user_instructions=c.get('user_instructions', '')
                ))
        
        if not criterion_objects:
            return False, "No valid criteria found. Please provide at least one criterion with name and description.", None
        
        # Run evaluation
        evaluation_results = judge.evaluate_simulation(
            str(simplified_path),
            criterion_objects,
            str(output_path)
        )
        
        return True, f"Evaluation completed! Results saved to {output_path}", evaluation_results
        
    except FileNotFoundError as e:
        return False, f"Transcript not found: {str(e)}. Generate unified transcript first.", None
    except Exception as e:
        return False, f"Error during evaluation: {str(e)}", None


def display_recent_outputs(output_dir):
    """Display recent simulation folders and their contents"""
    output_path = Path(output_dir)
    
    if not output_path.exists():
        st.info("No outputs yet")
        return
    
    # Get simulation folders (sorted by modification time, most recent first)
    sim_folders = [f for f in output_path.iterdir() if f.is_dir() and f.name.startswith("simulation_")]
    sim_folders = sorted(sim_folders, key=os.path.getmtime, reverse=True)[:5]
    
    if sim_folders:
        st.subheader("📁 Recent Simulations")
        for folder in sim_folders:
            with st.expander(f"📂 {folder.name}"):
                # List files in the folder
                files = list(folder.iterdir())
                
                # Group by type
                txt_files = [f for f in files if f.suffix == '.txt']
                json_files = [f for f in files if f.suffix == '.json']
                log_files = [f for f in files if f.suffix == '.log']
                
                col1, col2 = st.columns(2)
                
                with col1:
                    st.caption("📝 TXT Transcripts")
                    for f in txt_files:
                        if st.button(f"View {f.name}", key=f"view_{folder.name}_{f.name}"):
                            with open(f, 'r', encoding='utf-8') as file:
                                st.code(file.read(), language=None)
                    
                    st.caption("📋 Logs")
                    for f in log_files:
                        if st.button(f"View {f.name}", key=f"view_{folder.name}_{f.name}"):
                            with open(f, 'r', encoding='utf-8') as file:
                                st.code(file.read(), language=None)
                
                with col2:
                    st.caption("📊 JSON Transcripts")
                    for f in json_files:
                        if "eval_output" in f.name:
                            if st.button(f"📊 View {f.name}", key=f"view_{folder.name}_{f.name}"):
                                with open(f, 'r', encoding='utf-8') as file:
                                    eval_data = json.load(file)
                                    # Display evaluation nicely
                                    st.subheader("⚖️ LLM Judge Evaluation Results")
                                    
                                    summary = eval_data.get("summary", {})
                                    if summary:
                                        col1, col2 = st.columns(2)
                                        with col1:
                                            avg_score = summary.get("average_scale_score")
                                            if avg_score is not None:
                                                st.metric("Average Score", f"{avg_score}/10")
                                        with col2:
                                            pass_rate = summary.get("boolean_pass_rate")
                                            if pass_rate is not None:
                                                st.metric("Pass Rate", f"{pass_rate}%")
                                    
                                    criteria_evals = eval_data.get("criteria_evaluations", [])
                                    if criteria_evals:
                                        st.write("**Criteria Results:**")
                                        for criterion_eval in criteria_evals:
                                            criterion = criterion_eval.get("criterion", {})
                                            score = criterion_eval.get("score")
                                            if isinstance(score, bool):
                                                st.write(f"- {criterion.get('name', 'N/A')}: {'✅ PASS' if score else '❌ FAIL'}")
                                            elif isinstance(score, (int, float)):
                                                st.write(f"- {criterion.get('name', 'N/A')}: {score}/10")
                                    
                                    st.json(eval_data)
                        else:
                            if st.button(f"View {f.name}", key=f"view_{folder.name}_{f.name}"):
                                with open(f, 'r', encoding='utf-8') as file:
                                    st.json(json.load(file))
    else:
        # Fallback: show legacy files if any
        log_files = sorted(output_path.glob("*.log"), key=os.path.getmtime, reverse=True)[:5]
        transcript_files = sorted(output_path.glob("*_transcript.txt"), key=os.path.getmtime, reverse=True)[:5]
        
        if log_files:
            st.subheader("📋 Recent Logs")
            for log_file in log_files:
                st.text(log_file.name)
                if st.button(f"View", key=f"view_log_{log_file.name}"):
                    with open(log_file, 'r', encoding='utf-8') as f:
                        st.code(f.read(), language=None)
        
        if transcript_files:
            st.subheader("📝 Recent Transcripts")
            for transcript_file in transcript_files:
                st.text(transcript_file.name)
                if st.button(f"View", key=f"view_transcript_{transcript_file.name}"):
                    with open(transcript_file, 'r', encoding='utf-8') as f:
                        st.code(f.read(), language=None)

# Main content area
col1, col2 = st.columns([2, 1])

with col1:
    st.header("📊 Simulation Status")
    
    if st.session_state.simulation_running:
        st.warning("🟢 Simulation is currently running...")
        st.info(f"Simulation ID: {st.session_state.simulation_id}")
        if st.session_state.simulation_folder:
            st.caption(f"📁 Folder: {st.session_state.simulation_folder}")
        
        # Show timer
        if st.session_state.simulation_start_time:
            elapsed = time.time() - st.session_state.simulation_start_time
            minutes = int(elapsed // 60)
            seconds = int(elapsed % 60)
            st.metric("⏱️ Elapsed Time", f"{minutes:02d}:{seconds:02d}")
        
        # Show current turn-taking mode
        if st.session_state.allow_interruptions:
            st.caption("⚡ Mode: Interruptions allowed")
        else:
            st.caption("🎙️ Mode: Turn-taking (no interruptions)")
        
        # Stop button
        if st.button("🛑 Stop Simulation", type="primary"):
            stop_simulation()
            st.rerun()
        
        # Auto-refresh placeholder (use st.rerun() manually or with timer in production)
        # Note: Auto-refresh can be added with st.rerun() in a timer callback
        
        st.divider()
        
        # Kill terminals button (separate action)
        st.subheader("Terminal Management")
        st.warning("⚠️ This will close the Bot 1 and Bot 2 terminal windows")
        if st.button("🔪 Kill Bot Terminals", type="secondary"):
            kill_bot_terminals()
            st.rerun()
    else:
        st.info("⚪ No simulation running")
        
        # Start button
        if st.button("▶️ Start Simulation", type="primary"):
            # Use fixed prompt for Bot 1 and random persona prompt for Bot 2
            start_simulation(BOT1_IRA_SYSTEM_PROMPT, st.session_state.bot2_prompt, max_time, output_dir, allow_interruptions)
            st.rerun()
        
        # Show unified transcript generation button if we have paths from a previous simulation
        if st.session_state.simulation_folder and st.session_state.bot1_transcript_json:
            st.divider()
            st.subheader("📊 Generate Unified Transcript")
            st.caption(f"From: {st.session_state.simulation_folder}")
            if st.button("🔗 Generate Unified Transcript", type="secondary"):
                success, message = generate_unified_transcript()
                if success:
                    st.success(message)
                else:
                    st.warning(message)
                st.rerun()
            
            # LLM Judge Evaluation Section
            if LLM_JUDGE_AVAILABLE:
                st.divider()
                st.subheader("⚖️ LLM Judge Evaluation")
                st.caption("Evaluate conversation quality using LLM-as-a-Judge")
                
                # Check if unified transcript exists
                unified_path = Path(st.session_state.unified_transcript_path)
                evaluation_file = Path(st.session_state.simulation_folder) / "eval_output.json"
                
                # Check if evaluation already exists
                if evaluation_file.exists():
                    if st.button("📊 Load Existing Evaluation", type="secondary"):
                        try:
                            with open(evaluation_file, 'r', encoding='utf-8') as f:
                                st.session_state.evaluation_result = json.load(f)
                                st.session_state.evaluation_path = str(evaluation_file)
                            st.success("Evaluation loaded successfully!")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error loading evaluation: {str(e)}")
                
                # Check for simplified transcript (preferred) or unified transcript
                simplified_path = Path(st.session_state.simulation_folder) / "simplified_transcript.json"
                transcript_available = simplified_path.exists() or unified_path.exists()
                
                if transcript_available:
                    if st.button("⚖️ Run LLM Judge Evaluation", type="primary"):
                        with st.spinner("Running LLM Judge evaluation..."):
                            # Get API key from session state or environment
                            api_key = st.session_state.get("google_api_key", "") or os.getenv("GOOGLE_API_KEY", "")
                            model = st.session_state.get("judge_model", "gemini-2.0-flash-exp")
                            
                            # Get criteria from session state
                            criteria = st.session_state.get("evaluation_criteria", [])
                            
                            if not api_key:
                                st.error("❌ Google Gemini API key is required. Please enter it in the sidebar or set GOOGLE_API_KEY environment variable.")
                            elif not criteria or len(criteria) == 0:
                                st.error("❌ Please add at least one evaluation criterion in the sidebar.")
                            else:
                                try:
                                    success, message, results = run_llm_judge_evaluation(
                                        st.session_state.simulation_folder,
                                        api_key,
                                        model,
                                        criteria
                                    )
                                    
                                    if success:
                                        st.session_state.evaluation_result = results
                                        st.session_state.evaluation_path = str(Path(st.session_state.simulation_folder) / "eval_output.json")
                                        st.success(message)
                                        st.rerun()
                                    else:
                                        st.error(f"❌ {message}")
                                        st.info("💡 Check that the simplified transcript exists and the API key is correct.")
                                except Exception as e:
                                    st.error(f"❌ Error during evaluation: {str(e)}")
                                    st.info("💡 Make sure google-genai is installed: pip install google-genai")
                else:
                    st.info("ℹ️ Generate unified transcript first before running evaluation (this will also create simplified transcript)")
                
                # Display evaluation results if available
                if st.session_state.get("evaluation_result"):
                    st.divider()
                    st.subheader("📊 Evaluation Results")
                    
                    eval_result = st.session_state.evaluation_result
                    
                    # Display summary
                    summary = eval_result.get("summary", {})
                    if summary:
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            st.metric("Total Criteria", summary.get("total_criteria", 0))
                        with col2:
                            avg_score = summary.get("average_scale_score")
                            if avg_score is not None:
                                st.metric("Average Score (0-10)", f"{avg_score}/10")
                        with col3:
                            pass_rate = summary.get("boolean_pass_rate")
                            if pass_rate is not None:
                                st.metric("Pass Rate (%)", f"{pass_rate}%")
                    
                    # Display each criterion's results
                    criteria_evals = eval_result.get("criteria_evaluations", [])
                    for idx, criterion_eval in enumerate(criteria_evals):
                        criterion = criterion_eval.get("criterion", {})
                        criterion_name = criterion.get("name", f"Criterion {idx+1}")
                        
                        with st.expander(f"📋 {criterion_name}", expanded=(idx == 0)):
                            # Display criterion details
                            st.write(f"**Description:** {criterion.get('description', 'N/A')}")
                            st.write(f"**Scoring Type:** {criterion.get('scoring_type', 'N/A')}")
                            if criterion.get('user_instructions'):
                                st.write(f"**Instructions:** {criterion.get('user_instructions')}")
                            
                            st.divider()
                            
                            # Display evaluation steps
                            st.write("**Evaluation Steps:**")
                            eval_steps = criterion_eval.get("evaluation_steps", [])
                            for step_idx, step in enumerate(eval_steps, 1):
                                st.write(f"{step_idx}. {step}")
                            
                            st.divider()
                            
                            # Display score
                            score = criterion_eval.get("score")
                            if isinstance(score, bool):
                                st.metric("Result", "✅ PASS" if score else "❌ FAIL")
                            elif isinstance(score, (int, float)):
                                st.metric("Score", f"{score}/10")
                            else:
                                st.warning("Score not available")
                            
                            # Display reasoning
                            reasoning = criterion_eval.get("reasoning", "")
                            if reasoning:
                                st.write("**Reasoning:**")
                                st.write(reasoning)
                            
                            # Display step-by-step analysis
                            analysis = criterion_eval.get("step_by_step_analysis", "")
                            if analysis:
                                with st.expander("🔍 Step-by-Step Analysis"):
                                    st.write(analysis)
                    
                    # Metadata
                    metadata = eval_result.get("metadata", {})
                    if metadata:
                        with st.expander("ℹ️ Evaluation Metadata"):
                            st.json(metadata)
                    
                    # View full JSON
                    if st.button("📄 View Full Evaluation JSON"):
                        st.json(eval_result)
        
        # Show kill button even when not running (in case terminals are still open)
        st.divider()
        st.subheader("Terminal Management")
        if st.button("🔪 Kill Bot Terminals", type="secondary", key="kill_when_stopped"):
            kill_bot_terminals()
            st.rerun()

with col2:
    st.header("📁 Recent Outputs")
    display_recent_outputs(output_dir)

# Auto-refresh status (using placeholder for auto-refresh)
if st.session_state.simulation_running:
    # Note: In a real implementation, you might want to use st.rerun() with a timer
    # or check file timestamps to detect completion
    st.info("💡 Tip: Check the terminal windows and output files to monitor progress")

