# Bot-to-Bot Simulation Control Panel

A Streamlit-based UI for running automated bot-to-bot conversations with configurable system prompts, time limits, and automatic logging.

## Features

1. **Automated Process Management**: Both bots run automatically in separate terminal windows when you start a simulation
2. **Streamlit UI**: Easy-to-use web interface for configuration and monitoring
3. **Configurable System Prompts**: Set custom system prompts for both bots directly in the UI
4. **Time Limits**: Set maximum simulation duration in seconds
5. **Automatic Logging**: Each simulation generates log files and transcript files
6. **Bot 1 Speaks First**: Bot 1 always initiates the conversation
7. **Simple LLM Judge**: Evaluate conversation quality using a user-friendly LLM-as-a-Judge system
8. **Comprehensive Tracing**: Detailed metrics tracking including latency, turn-taking, and performance metrics
9. **Unified Transcripts**: Automatically merge transcripts from both bots into a single conversation view

## Setup

1. Make sure you have all required dependencies installed:
   ```bash
   pip install streamlit pipecat-ai livekit google-genai
   ```
   
   Note: `google-genai` is required for LLM Judge functionality. If you don't need evaluation, you can skip it.

2. Ensure your API keys are configured in `simulation.py`:
   - LIVEKIT_URL
   - LIVEKIT_API_KEY
   - LIVEKIT_API_SECRET
   - DEEPGRAM_API_KEY
   - GOOGLE_API_KEY
   
   For LLM Judge (optional):
   - GOOGLE_API_KEY (can be set in environment variable or entered in UI)

## Usage

1. **Start the Streamlit UI**:
   ```bash
   streamlit run app.py
   ```

2. **Configure the Simulation**:
   - Set system prompts for Bot 1 and Bot 2 in the sidebar
   - Set the maximum simulation time (in seconds)
   - Optionally change the output directory
   - Configure LLM Judge settings (Google API key, model selection, custom criteria)

3. **Start the Simulation**:
   - Click "▶️ Start Simulation"
   - Two separate terminal windows will open automatically:
     - One for Bot 1 (speaks first)
     - One for Bot 2
   - The simulation will run until the time limit is reached

4. **Monitor Progress**:
   - Check the terminal windows for real-time logs
   - View generated log and transcript files in the UI
   - Files are saved in the `simulation_outputs` directory by default

5. **Stop the Simulation**:
   - Click "🛑 Stop Simulation" to attempt to stop the processes
   - You may need to manually close the terminal windows on Windows

6. **Evaluate Conversations**:
   - After a simulation completes, generate a unified transcript
   - Define evaluation criteria in the sidebar (name, description, scoring type, instructions)
   - Click "⚖️ Run LLM Judge Evaluation" to evaluate conversation quality
   - View detailed scores, reasoning, and step-by-step analysis
   - Evaluation results are saved as `eval_output.json` in the simulation folder

## Output Files

Each simulation generates the following files in a timestamped folder:

- `bot1_Ira.log` - Detailed log file for Bot 1
- `bot1_Ira_transcript.txt` - Conversation transcript for Bot 1 (TXT format)
- `bot1_Ira_transcript.json` - Conversation transcript for Bot 1 (JSON format)
- `bot1_Ira_tracing.json` - Performance metrics and tracing data for Bot 1
- `bot2_Chetan.log` - Detailed log file for Bot 2
- `bot2_Chetan_transcript.txt` - Conversation transcript for Bot 2 (TXT format)
- `bot2_Chetan_transcript.json` - Conversation transcript for Bot 2 (JSON format)
- `bot2_Chetan_tracing.json` - Performance metrics and tracing data for Bot 2
- `unified_transcript.json` - Merged conversation transcript from both bots
- `simplified_transcript.json` - Simplified conversation transcript (bot + message only)
- `eval_output.json` - LLM Judge evaluation results (if evaluation was run)

## Simple LLM Judge System

The LLM Judge is a user-friendly evaluation system where you define criteria in natural language. The LLM then:
1. Generates evaluation steps based on your criteria
2. Evaluates the conversation following those steps
3. Provides detailed scores and reasoning

### Defining Criteria

For each criterion, you specify:
- **Name**: Short identifier (e.g., "Response Relevance")
- **Description**: What you want to evaluate in natural language
- **Scoring Type**: Either "scale" (0-10) or "boolean" (True/False)
- **Instructions**: How points should be allocated

### Example Criteria

**Scale Criterion**:
- Name: Response Relevance
- Description: Evaluate whether the bot's responses are relevant to the user's questions
- Scoring Type: scale
- Instructions: Give 8-10 for highly relevant responses, 0-4 for off-topic responses

**Boolean Criterion**:
- Name: Professional Tone
- Description: Check if the conversation maintains a professional tone throughout
- Scoring Type: boolean
- Instructions: Return True only if ALL messages are professional

### Evaluation Process

1. You define criteria in the sidebar
2. The LLM generates 4-6 evaluation steps for each criterion
3. The LLM evaluates the conversation following those steps
4. Results include scores, reasoning, and step-by-step analysis
5. Summary statistics are calculated (average scores, pass rates)

See `LLM_JUDGE_README.md` for detailed documentation.

## Notes

- Bot 1 always speaks first in the conversation
- Both bots run in separate processes to avoid lag
- On Windows, terminal windows are opened automatically using `start cmd /k`
- The simulation automatically stops after the specified time limit
- Transcripts capture all spoken messages and responses
- LLM Judge evaluations require a Google Gemini API key (can be set via environment variable `GOOGLE_API_KEY` or entered in UI)
- Define at least one evaluation criterion with a name and description to run evaluations

