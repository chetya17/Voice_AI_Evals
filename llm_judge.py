"""
Simple LLM-as-a-Judge System for Bot-to-Bot Simulation Evaluation

This module implements a straightforward LLM-based evaluation system where:
1. Users define evaluation criteria in natural language
2. Users specify scoring type (0-10 scale or True/False)
3. The LLM generates evaluation steps based on the criteria
4. The LLM judges the conversation outputs
5. Results are displayed and saved in JSON format
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass, field, asdict

logger = logging.getLogger("llm_judge")

# Import Google GenAI for Gemini
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("Google GenAI not installed. Install with: pip install google-genai")


@dataclass
class EvaluationCriterion:
    """
    A single evaluation criterion defined by the user.
    
    Attributes:
        name: Name of the criterion
        description: Natural language description of what to evaluate
        scoring_type: Either "scale" (0-10) or "boolean" (True/False)
        user_instructions: Additional instructions on how points should be allocated
    """
    name: str
    description: str
    scoring_type: str = "scale"  # "scale" or "boolean"
    user_instructions: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EvaluationCriterion':
        """Create from dictionary."""
        return cls(**data)


class SimpleLLMJudge:
    """
    Simple LLM-as-a-Judge system that:
    1. Takes user-defined criteria
    2. Generates evaluation steps using LLM
    3. Evaluates conversation outputs
    4. Returns results in a clear format
    """
    
    def __init__(self, 
                 api_key: Optional[str] = None, 
                 model: str = "gemini-2.0-flash-exp"):
        """
        Initialize the LLM Judge.
        
        Args:
            api_key: Google API key (if None, will try GOOGLE_API_KEY env var)
            model: Gemini model to use (default: "gemini-2.0-flash-exp")
        """
        # Set Google API key
        if api_key:
            self.api_key = api_key
        else:
            self.api_key = os.getenv("GOOGLE_API_KEY")
        
        if not self.api_key:
            raise ValueError("Google API key is required. Provide it or set GOOGLE_API_KEY environment variable.")
        
        self.model = model
        self.logger = logging.getLogger(f"{__name__}.SimpleLLMJudge")
        
        # Initialize Gemini client
        self.client = genai.Client(api_key=self.api_key)
    
    def _call_llm(self, prompt: str) -> str:
        """Call the LLM with a prompt and return the response."""
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            return response.text
        except Exception as e:
            self.logger.error(f"Error calling LLM: {e}")
            raise
    
    def generate_evaluation_steps(self, criterion: EvaluationCriterion) -> List[str]:
        """
        Generate evaluation steps for a criterion using the LLM.
        
        Args:
            criterion: The evaluation criterion
            
        Returns:
            List of evaluation steps
        """
        prompt = f"""You are an expert evaluator. Given an evaluation criterion, generate a clear, step-by-step process to evaluate it.

Criterion Name: {criterion.name}
Criterion Description: {criterion.description}
Scoring Type: {criterion.scoring_type} {"(0-10 scale)" if criterion.scoring_type == "scale" else "(True/False)"}
Additional Instructions: {criterion.user_instructions if criterion.user_instructions else "None"}

Generate 4-6 specific, actionable evaluation steps that an evaluator should follow to assess this criterion.
Each step should be clear and focused on a specific aspect of the evaluation.

Format your response as a numbered list, one step per line.
Example:
1. First evaluation step
2. Second evaluation step
3. Third evaluation step

Your evaluation steps:"""

        response = self._call_llm(prompt)
        
        # Parse the response into a list of steps
        steps = []
        for line in response.strip().split('\n'):
            line = line.strip()
            # Remove numbering if present
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                # Remove leading number, dot, dash, or bullet
                cleaned = line.lstrip('0123456789.-•) ').strip()
                if cleaned:
                    steps.append(cleaned)
        
        return steps if steps else [response.strip()]
    
    def evaluate_conversation(self, 
                            conversation_history: List[Dict[str, str]], 
                            criterion: EvaluationCriterion,
                            evaluation_steps: List[str]) -> Dict[str, Any]:
        """
        Evaluate a conversation based on a criterion and evaluation steps.
        
        Args:
            conversation_history: List of conversation turns with 'bot' and 'message' keys
            criterion: The evaluation criterion
            evaluation_steps: The evaluation steps to follow
            
        Returns:
            Dictionary with evaluation results
        """
        # Format conversation for the prompt
        conversation_text = "\n".join([
            f"{turn.get('bot', 'Unknown')}: {turn.get('message', '')}"
            for turn in conversation_history
        ])
        
        # Build evaluation prompt
        steps_text = "\n".join([f"{i+1}. {step}" for i, step in enumerate(evaluation_steps)])
        
        if criterion.scoring_type == "scale":
            scoring_instruction = """Provide a score from 0 to 10, where:
- 0-3: Poor/Unsatisfactory
- 4-6: Adequate/Acceptable
- 7-8: Good
- 9-10: Excellent

Your response MUST be in this exact JSON format:
{
  "score": <number between 0 and 10>,
  "reasoning": "<detailed explanation of your evaluation>",
  "step_by_step_analysis": "<analysis following each evaluation step>"
}"""
        else:  # boolean
            scoring_instruction = """Provide a True or False score based on whether the criterion is met.

Your response MUST be in this exact JSON format:
{
  "score": <true or false>,
  "reasoning": "<detailed explanation of your evaluation>",
  "step_by_step_analysis": "<analysis following each evaluation step>"
}"""
        
        prompt = f"""You are an expert conversation evaluator. Evaluate the following conversation based on the given criterion.

CRITERION: {criterion.name}
DESCRIPTION: {criterion.description}
{f"ADDITIONAL INSTRUCTIONS: {criterion.user_instructions}" if criterion.user_instructions else ""}

EVALUATION STEPS TO FOLLOW:
{steps_text}

CONVERSATION TO EVALUATE:
{conversation_text}

{scoring_instruction}"""

        response = self._call_llm(prompt)
        
        # Parse the JSON response
        try:
            # Try to extract JSON from the response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                result = json.loads(json_str)
            else:
                # Fallback: create a structured response
                result = {
                    "score": None,
                    "reasoning": response,
                    "step_by_step_analysis": "Could not parse structured response"
                }
        except json.JSONDecodeError:
            # Fallback: create a structured response
            result = {
                "score": None,
                "reasoning": response,
                "step_by_step_analysis": "Could not parse structured response"
            }
        
        return result
    
    def evaluate_simulation(self, 
                          transcript_path: str,
                          criteria: List[EvaluationCriterion],
                          output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Evaluate a simulation transcript with multiple criteria.
        
        Args:
            transcript_path: Path to the simplified transcript JSON file
            criteria: List of evaluation criteria
            output_path: Optional path to save evaluation results
            
        Returns:
            Dictionary with all evaluation results
        """
        self.logger.info(f"Starting evaluation of: {transcript_path}")
        
        # Load transcript
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        conversation_history = transcript_data.get("messages", [])
        
        if not conversation_history:
            raise ValueError("No conversation messages found in transcript")
        
        # Evaluate each criterion
        all_results = {
            "metadata": {
                "simulation_id": transcript_data.get("simulation_id", "unknown"),
                "bot1_name": transcript_data.get("bot1_name", "Bot 1"),
                "bot2_name": transcript_data.get("bot2_name", "Bot 2"),
                "total_messages": len(conversation_history),
                "evaluation_timestamp": datetime.now().isoformat(),
                "model_used": self.model
            },
            "criteria_evaluations": []
        }
        
        for criterion in criteria:
            self.logger.info(f"Evaluating criterion: {criterion.name}")
            
            # Generate evaluation steps
            self.logger.info(f"Generating evaluation steps for: {criterion.name}")
            evaluation_steps = self.generate_evaluation_steps(criterion)
            
            # Evaluate
            self.logger.info(f"Running evaluation for: {criterion.name}")
            evaluation_result = self.evaluate_conversation(
                conversation_history, 
                criterion, 
                evaluation_steps
            )
            
            # Store results
            criterion_result = {
                "criterion": criterion.to_dict(),
                "evaluation_steps": evaluation_steps,
                "score": evaluation_result.get("score"),
                "reasoning": evaluation_result.get("reasoning", ""),
                "step_by_step_analysis": evaluation_result.get("step_by_step_analysis", "")
            }
            
            all_results["criteria_evaluations"].append(criterion_result)
        
        # Calculate summary statistics
        scale_scores = [
            r["score"] for r in all_results["criteria_evaluations"] 
            if isinstance(r["score"], (int, float))
        ]
        boolean_scores = [
            r["score"] for r in all_results["criteria_evaluations"] 
            if isinstance(r["score"], bool)
        ]
        
        all_results["summary"] = {
            "total_criteria": len(criteria),
            "scale_criteria_count": len(scale_scores),
            "boolean_criteria_count": len(boolean_scores),
            "average_scale_score": round(sum(scale_scores) / len(scale_scores), 2) if scale_scores else None,
            "boolean_pass_rate": round(sum(boolean_scores) / len(boolean_scores) * 100, 1) if boolean_scores else None
        }
        
        # Save results if output path provided
        if output_path:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(all_results, f, indent=2, ensure_ascii=False)
            self.logger.info(f"Evaluation results saved to: {output_path}")
        
        return all_results


def evaluate_simulation_simple(
    transcript_path: str,
    criteria: List[Dict[str, Any]],
    api_key: Optional[str] = None,
    model: str = "gemini-2.0-flash-exp",
    output_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to evaluate a simulation.
    
    Args:
        transcript_path: Path to simplified transcript JSON
        criteria: List of criterion dictionaries with keys:
                 - name: str
                 - description: str
                 - scoring_type: "scale" or "boolean"
                 - user_instructions: str (optional)
        api_key: Google API key
        model: Gemini model to use
        output_path: Optional path to save results
        
    Returns:
        Evaluation results dictionary
    """
    # Convert criteria dicts to EvaluationCriterion objects
    criterion_objects = [EvaluationCriterion(**c) for c in criteria]
    
    # Create judge and evaluate
    judge = SimpleLLMJudge(api_key=api_key, model=model)
    results = judge.evaluate_simulation(transcript_path, criterion_objects, output_path)
    
    return results


# Example usage
if __name__ == "__main__":
    # Example criteria
    example_criteria = [
        {
            "name": "Response Relevance",
            "description": "Evaluate whether the bot's responses are relevant to the user's questions and stay on topic",
            "scoring_type": "scale",
            "user_instructions": "Give higher scores (8-10) for responses that directly address the question. Give lower scores (0-4) for off-topic or irrelevant responses."
        },
        {
            "name": "Professional Tone",
            "description": "Check if the conversation maintains a professional and courteous tone throughout",
            "scoring_type": "boolean",
            "user_instructions": "Return True only if ALL messages maintain professional language. Return False if any message is unprofessional or rude."
        },
        {
            "name": "Problem Resolution",
            "description": "Assess whether the customer's problem was successfully resolved by the end of the conversation",
            "scoring_type": "scale",
            "user_instructions": "Score 0-3 if problem not addressed, 4-6 if partially resolved, 7-8 if mostly resolved, 9-10 if completely resolved with customer satisfaction."
        }
    ]
    
    # Example usage
    # results = evaluate_simulation_simple(
    #     transcript_path="path/to/simplified_transcript.json",
    #     criteria=example_criteria,
    #     api_key="your-api-key",
    #     output_path="path/to/eval_output.json"
    # )
    
    print("LLM Judge module loaded successfully!")
    print("\nExample criteria structure:")
    print(json.dumps(example_criteria, indent=2))

