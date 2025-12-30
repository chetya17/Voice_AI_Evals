# Bot-to-Bot Voice Simulation Framework

A comprehensive framework for testing voice AI assistants through automated bot-to-bot conversations with real-time metrics tracking and LLM-based evaluation.

## 🌟 Features

- **Automated Bot-to-Bot Conversations**: Run realistic voice conversations between two AI bots
- **Streamlit Web Interface**: Easy-to-use UI for configuration and monitoring
- **Persona-Based Testing**: Test against multiple user personas loaded from JSON
- **Turn-Taking Control**: Enable/disable interruptions for natural conversation flow
- **Goal-Based Termination**: Automatically end conversations when goals are achieved
- **Comprehensive Tracing**: Track latency metrics (VAD, STT, LLM, TTS, end-to-end)
- **LLM-as-a-Judge Evaluation**: Define custom evaluation criteria in natural language
- **Unified Transcripts**: Automatically merge and format conversation transcripts
- **Real-time Monitoring**: View conversations in separate terminal windows

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
- [Evaluation System](#evaluation-system)
- [Output Files](#output-files)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

- **Python 3.8+**
- **API Keys** (see Configuration section):
  - LiveKit (for real-time communication)
  - Deepgram (for speech-to-text and text-to-speech)
  - Google Gemini (for LLM responses and evaluation)

## 📦 Installation

1. **Clone or download this repository**

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

The `requirements.txt` includes:
- `pipecat-ai[google,deepgram,livekit,silero]>=0.0.98` - Core framework
- `livekit>=0.12.0` - Real-time communication
- `streamlit>=1.32.0` - Web UI
- `google-genai>=0.4.0` - LLM and evaluation
- `python-dotenv>=1.0.0` - Environment management

## ⚙️ Configuration

### 1. Set Up Environment Variables

Copy `env.example` to `.env` and fill in your API keys:

   ```bash
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# Deepgram API Key
DEEPGRAM_API_KEY=your-deepgram-api-key

# Google Gemini API Key
GOOGLE_API_KEY=your-google-api-key

# Optional: Custom room name
ROOM_NAME=testingsims
```

**Where to get API keys:**
- **LiveKit**: [livekit.io](https://livekit.io/) - Sign up for free tier
- **Deepgram**: [deepgram.com](https://deepgram.com/) - Get API key from console
- **Google Gemini**: [Google AI Studio](https://makersuite.google.com/app/apikey)

### 2. Configure Personas

Edit `personas.json` to define test user personas. Each persona includes:
- `persona_name`: Display name
- `scenario_name`: Test scenario description
- `system_prompt`: Detailed behavior instructions

Example:
```json
{
  "id": "sim_01_ramesh_upi",
  "persona_name": "Ramesh Uncle",
  "scenario_name": "UPI Payment Hesitation",
  "system_prompt": "You are Ramesh, a 68-year-old retired government employee..."
}
```

## 🚀 Quick Start

### 1. Start the Application

   ```bash
   streamlit run app.py
   ```

Your browser will open to `http://localhost:8501`

### 2. Configure Simulation (Sidebar)

- **Bot 1**: Fixed as "Ira" - Personal Voice AI Assistant for Indian customers
- **Bot 2**: Click "🔄 Select New Random Persona" to choose a test persona
- **Turn-Taking**: Toggle interruptions on/off
- **Conversation Goal**: (Optional) Describe the conversation objective
- **Max Time**: Set timeout in seconds (default: 300)

### 3. Run Simulation

1. Click **"▶️ Start Simulation"**
2. Two terminal windows will open (Bot 1 and Bot 2)
3. Watch the conversation unfold in real-time
4. Click **"🛑 Stop Simulation"** when done

### 4. Generate Transcript

Click **"🔗 Generate Unified Transcript"** to create:
- `unified_transcript.json` - Complete conversation with timestamps
- `simplified_transcript.json` - Clean bot-message pairs for evaluation

### 5. Evaluate (Optional)

1. Define evaluation criteria in the sidebar
2. Click **"⚖️ Run LLM Judge Evaluation"**
3. View results and scores

## 📖 Usage Guide

### Turn-Taking Modes

**Interruptions Enabled** (Default):
- Bots can speak over each other
- More natural, dynamic conversations
- Uses VAD (Voice Activity Detection) for speech detection

**Interruptions Disabled**:
- Bots wait for each other to finish speaking
- Uses VAD + SmartTurnAnalyzer for end-of-turn detection
- More structured, turn-based conversations

### Goal-Based Termination

Set a conversation goal in the sidebar:
```
Example: "Help the user complete a UPI payment successfully"
```

The system will:
1. Monitor conversation progress every 3 turns
2. Use LLM to check if goal is met
3. Automatically stop when goal achieved (confidence > 0.7)
4. Fall back to max time limit if goal not met

### Monitoring

**Terminal Windows**:
- Bot 1 terminal: Shows Ira's logs and responses
- Bot 2 terminal: Shows persona's logs and responses

**Streamlit UI**:
- Elapsed time counter
- Current mode (interruptions on/off)
- Simulation status
- Recent output files

## 🎯 Evaluation System

### LLM-as-a-Judge

Define custom evaluation criteria in natural language. The LLM will:
1. Generate 4-6 evaluation steps based on your criteria
2. Evaluate the conversation following those steps
3. Provide detailed scores and reasoning

### Defining Criteria

Click **"➕ Add Criterion"** in the sidebar and fill in:

**Scale Criterion (0-10)**:
```
Name: Response Relevance
Description: Evaluate whether bot responses are relevant to user questions
Scoring Type: scale
Instructions: Give 8-10 for highly relevant, 4-7 for adequate, 0-3 for off-topic
```

**Boolean Criterion (True/False)**:
```
Name: Professional Tone
Description: Check if conversation maintains professional language
Scoring Type: boolean
Instructions: Return True only if ALL messages are professional
```

### Evaluation Results

Results include:
- **Summary Statistics**: Average scores, pass rates
- **Per-Criterion Results**:
  - Generated evaluation steps
  - Score (0-10 or True/False)
  - Detailed reasoning
  - Step-by-step analysis
- **Saved to**: `eval_output.json` in simulation folder

### Example Evaluation Output

```json
{
  "metadata": {
    "simulation_id": "20240101_120000",
    "total_messages": 10,
    "model_used": "gemini-2.0-flash-exp"
  },
  "criteria_evaluations": [
    {
      "criterion": {
        "name": "Response Relevance",
        "scoring_type": "scale"
      },
      "evaluation_steps": ["Step 1...", "Step 2..."],
      "score": 8.5,
      "reasoning": "Responses were highly relevant..."
    }
  ],
  "summary": {
    "total_criteria": 3,
    "average_scale_score": 8.25,
    "boolean_pass_rate": 100.0
  }
}
```

## 📁 Output Files

Each simulation creates a timestamped folder in `simulation_outputs/`:

```
simulation_outputs/
└── simulation_20240101_120000/
    ├── bot1_Ira.log                    # Detailed logs for Bot 1
    ├── bot1_Ira_transcript.txt         # Text transcript for Bot 1
    ├── bot1_Ira_transcript.json        # JSON transcript for Bot 1
    ├── bot1_Ira_tracing.json          # Performance metrics for Bot 1
    ├── bot2_Chetan.log                 # Detailed logs for Bot 2
    ├── bot2_Chetan_transcript.txt      # Text transcript for Bot 2
    ├── bot2_Chetan_transcript.json     # JSON transcript for Bot 2
    ├── bot2_Chetan_tracing.json       # Performance metrics for Bot 2
    ├── unified_transcript.json         # Merged conversation
    ├── simplified_transcript.json      # Clean bot-message pairs
    └── eval_output.json               # Evaluation results (if run)
```

### Tracing Metrics

Each `*_tracing.json` file includes:
- **First LLM Token Timestamp**: When LLM started responding
- **First Spoken Token Timestamp**: When audio output started
- **Per-Turn Metrics**:
  - VAD latency (voice detection)
  - STT latency (speech-to-text)
  - LLM latency (response generation)
  - TTS latency (text-to-speech)
  - End-to-end latency (total response time)

## 🔬 Advanced Features

### Programmatic Usage

You can use the LLM judge programmatically:

```python
from llm_judge import SimpleLLMJudge, EvaluationCriterion

# Define criteria
criteria = [
    EvaluationCriterion(
        name="Response Quality",
        description="Evaluate response quality",
        scoring_type="scale",
        user_instructions="8-10 for excellent, 0-4 for poor"
    )
]

# Create judge and evaluate
judge = SimpleLLMJudge(api_key="your-key", model="gemini-2.0-flash-exp")
results = judge.evaluate_simulation(
    transcript_path="path/to/simplified_transcript.json",
    criteria=criteria,
    output_path="path/to/eval_output.json"
)

print(f"Average score: {results['summary']['average_scale_score']}")
```

### Goal Detection

The `goal_detector.py` module can be used independently:

```python
from goal_detector import GoalDetector

detector = GoalDetector(api_key="your-key")
result = detector.check_goal_met(
    conversation_history=[
        {"speaker": "Bot1", "message": "Hello!"},
        {"speaker": "Bot2", "message": "Hi there!"}
    ],
    goal_description="Greet the user warmly"
)

print(f"Goal met: {result['goal_met']}")
print(f"Confidence: {result['confidence']}")
print(f"Reasoning: {result['reasoning']}")
```

### Custom Tracing

Access tracing data programmatically:

```python
from tracing import SimulationTracer, get_tracer

# In your bot code
tracer = get_tracer()
if tracer:
    summary = tracer.get_summary()
    print(f"Average LLM latency: {summary['average_latencies']['llm_latency']}")
```

## 🐛 Troubleshooting

### Common Issues

**"LLM Judge not available"**
- Install: `pip install google-genai`

**"Google API key is required"**
- Set `GOOGLE_API_KEY` environment variable or enter in sidebar

**"No valid criteria found"**
- Add at least one criterion with both name and description

**"Simplified transcript not found"**
- Generate unified transcript first (creates simplified version automatically)

**Terminals not opening (Windows)**
- Run in PowerShell or CMD
- Check Windows Defender isn't blocking terminal creation

**Terminals not opening (Linux/Mac)**
- Install xterm: `sudo apt-get install xterm`

**Bots not connecting**
- Verify LiveKit credentials in environment variables
- Check internet connection
- Ensure LiveKit server is accessible

**High latency**
- Check network connection
- Try different Gemini model (e.g., `gemini-2.0-flash-exp` is faster)
- Reduce conversation complexity

### Terminal Management

If terminals don't close properly:
1. Click **"🔪 Kill Bot Terminals"** in the UI
2. Manually close terminal windows
3. On Windows, use Task Manager to end `cmd.exe` processes if needed

### API Rate Limits

If you hit rate limits:
- **Deepgram**: Upgrade plan or reduce simulation frequency
- **Google Gemini**: Wait for quota reset or use different API key
- **LiveKit**: Check your plan limits

## 📊 Performance Tips

1. **Use faster models**: `gemini-2.0-flash-exp` for speed, `gemini-1.5-pro` for quality
2. **Optimize prompts**: Shorter prompts = faster responses
3. **Monitor metrics**: Check tracing logs to identify bottlenecks
4. **Adjust VAD settings**: Tune confidence and timing in `simulation.py`
5. **Limit simulation time**: Set reasonable max time limits

## 🔒 Security Notes

- **Never commit API keys** to version control
- **Use environment variables** for all sensitive credentials
- **Rotate keys regularly** for production use
- **Monitor API usage** to prevent unexpected charges
- **Restrict API key permissions** to minimum required

## 📝 Project Structure

```
.
├── app.py                 # Streamlit web interface
├── simulation.py          # Bot simulation runner
├── llm_judge.py          # LLM-based evaluation system
├── goal_detector.py      # Goal detection module
├── tracing.py            # Metrics tracking system
├── personas.json         # Test user personas
├── requirements.txt      # Python dependencies
├── env.example          # Environment variables template
└── README.md            # This file
```

## 🤝 Contributing

This is an assessment project, but suggestions are welcome:
1. Test the system thoroughly
2. Report any bugs or issues
3. Suggest improvements to evaluation criteria
4. Share interesting persona configurations

## 📄 License

This project is provided as-is for assessment purposes.

## 🙏 Acknowledgments

Built with:
- [Pipecat](https://github.com/pipecat-ai/pipecat) - Voice AI framework
- [LiveKit](https://livekit.io/) - Real-time communication
- [Deepgram](https://deepgram.com/) - Speech recognition and synthesis
- [Google Gemini](https://ai.google.dev/) - LLM capabilities
- [Streamlit](https://streamlit.io/) - Web interface

---

**Need help?** Check the troubleshooting section or review the code comments for detailed explanations.
