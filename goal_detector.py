"""
Goal Detection Module for Bot-to-Bot Simulation

This module provides LLM-based goal detection to determine when a conversation
has achieved its objective and should end naturally.
"""

import json
import logging
import os
from typing import Dict, List, Optional

# Try to import Google GenAI (new library)
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

logger = logging.getLogger("goal_detector")


class GoalDetector:
    """
    Detects when conversation goals are met using LLM analysis.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.0-flash-exp"):
        """
        Initialize the goal detector.
        
        Args:
            api_key: Google Gemini API key (if None, will try to get from environment)
            model: Model to use for goal detection
        """
        if not GEMINI_AVAILABLE:
            raise ImportError("Google GenAI library is required. Install with: pip install google-genai")
        
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        self.model = model
        
        if not self.api_key:
            raise ValueError("Google Gemini API key is required for goal detection.")
        
        # Initialize the new genai Client
        self.client = genai.Client(api_key=self.api_key)
        self.logger = logging.getLogger(f"{__name__}.GoalDetector")
    
    def check_goal_met(self, conversation_history: List[Dict], goal_description: str = None) -> Dict:
        """
        Check if the conversation goal has been met.
        
        Args:
            conversation_history: List of conversation entries with 'speaker' and 'message' keys
            goal_description: Optional description of the conversation goal
            
        Returns:
            Dictionary with 'goal_met' (bool), 'confidence' (float), and 'reasoning' (str)
        """
        # Format conversation for analysis
        conversation_text = ""
        for entry in conversation_history[-10:]:  # Last 10 messages for context
            speaker = entry.get("speaker", "Unknown")
            message = entry.get("message", entry.get("text", ""))
            if message:
                conversation_text += f"{speaker}: {message}\n"
        
        # Create prompt
        if goal_description:
            prompt = f"""Analyze this conversation to determine if the stated goal has been achieved.

Goal: {goal_description}

Recent Conversation:
{conversation_text}

Determine if the conversation goal has been met. Respond with JSON:
{{
    "goal_met": true/false,
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}}"""
        else:
            prompt = f"""Analyze this conversation to determine if it has reached a natural conclusion.

Recent Conversation:
{conversation_text}

Determine if the conversation has naturally concluded (e.g., both parties have said goodbye, 
the main topic is resolved, or there's a clear ending). Respond with JSON:
{{
    "goal_met": true/false,
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}}"""
        
        try:
            # Generate content with the new google-genai client
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json"
                )
            )
            
            result = json.loads(response.text)
            
            # Ensure proper format
            return {
                "goal_met": bool(result.get("goal_met", False)),
                "confidence": float(result.get("confidence", 0.0)),
                "reasoning": str(result.get("reasoning", ""))
            }
            
        except Exception as e:
            self.logger.error(f"Error in goal detection: {e}")
            # Default to not met on error
            return {
                "goal_met": False,
                "confidence": 0.0,
                "reasoning": f"Error during detection: {str(e)}"
            }
