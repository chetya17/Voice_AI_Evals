"""
Test script for the Simple LLM Judge system
"""

import json
from llm_judge import SimpleLLMJudge, EvaluationCriterion

# Example test data - create a sample simplified transcript
sample_transcript = {
    "simulation_id": "test_20240101_120000",
    "bot1_name": "Ira",
    "bot2_name": "Chetan",
    "messages": [
        {"bot": "Bot 1", "message": "Hello! I'm from customer support. How can I help you today?"},
        {"bot": "Bot 2", "message": "Hi, I received a damaged order and I'm very frustrated."},
        {"bot": "Bot 1", "message": "I'm so sorry to hear that. Let me help you with this right away. Can you provide your order number?"},
        {"bot": "Bot 2", "message": "Yes, it's ORDER-12345. The food was completely cold and the packaging was torn."},
        {"bot": "Bot 1", "message": "Thank you for providing that. I've located your order. I'll process a full refund immediately and send you a discount code for your next order."},
        {"bot": "Bot 2", "message": "That sounds good. How long will the refund take?"},
        {"bot": "Bot 1", "message": "The refund will be processed within 24 hours and should appear in your account within 3-5 business days. Is there anything else I can help you with?"},
        {"bot": "Bot 2", "message": "No, that's all. Thank you for your help."}
    ]
}

# Save sample transcript
with open("test_transcript.json", "w", encoding="utf-8") as f:
    json.dump(sample_transcript, f, indent=2)

print("✅ Sample transcript created: test_transcript.json")

# Define test criteria
test_criteria = [
    EvaluationCriterion(
        name="Response Relevance",
        description="Evaluate whether the bot's responses are relevant to the user's questions and stay on topic",
        scoring_type="scale",
        user_instructions="Give higher scores (8-10) for responses that directly address the question. Give lower scores (0-4) for off-topic or irrelevant responses."
    ),
    EvaluationCriterion(
        name="Professional Tone",
        description="Check if the conversation maintains a professional and courteous tone throughout",
        scoring_type="boolean",
        user_instructions="Return True only if ALL messages maintain professional language. Return False if any message is unprofessional or rude."
    ),
    EvaluationCriterion(
        name="Problem Resolution",
        description="Assess whether the customer's problem was successfully resolved by the end of the conversation",
        scoring_type="scale",
        user_instructions="Score 0-3 if problem not addressed, 4-6 if partially resolved, 7-8 if mostly resolved, 9-10 if completely resolved with customer satisfaction."
    )
]

print("\n📋 Test Criteria:")
for i, criterion in enumerate(test_criteria, 1):
    print(f"{i}. {criterion.name} ({criterion.scoring_type})")
    print(f"   Description: {criterion.description}")

print("\n" + "="*60)
print("To run the test, you need to:")
print("1. Set your GOOGLE_API_KEY environment variable")
print("2. Run this script with the judge initialization")
print("="*60)

# Uncomment below to actually run the test (requires API key)
"""
import os

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("\n❌ GOOGLE_API_KEY not found in environment variables")
    print("Set it with: export GOOGLE_API_KEY='your-key-here'")
else:
    print("\n🚀 Running LLM Judge evaluation...")
    
    try:
        judge = SimpleLLMJudge(api_key=api_key, model="gemini-2.0-flash-exp")
        
        results = judge.evaluate_simulation(
            "test_transcript.json",
            test_criteria,
            "test_eval_output.json"
        )
        
        print("\n✅ Evaluation completed!")
        print(f"\n📊 Results Summary:")
        print(f"Total Criteria: {results['summary']['total_criteria']}")
        if results['summary']['average_scale_score']:
            print(f"Average Scale Score: {results['summary']['average_scale_score']}/10")
        if results['summary']['boolean_pass_rate']:
            print(f"Boolean Pass Rate: {results['summary']['boolean_pass_rate']}%")
        
        print(f"\n💾 Full results saved to: test_eval_output.json")
        
        # Display individual results
        print("\n📋 Individual Criterion Results:")
        for criterion_eval in results['criteria_evaluations']:
            criterion = criterion_eval['criterion']
            score = criterion_eval['score']
            print(f"\n{criterion['name']}:")
            if isinstance(score, bool):
                print(f"  Result: {'✅ PASS' if score else '❌ FAIL'}")
            else:
                print(f"  Score: {score}/10")
            print(f"  Reasoning: {criterion_eval['reasoning'][:100]}...")
        
    except Exception as e:
        print(f"\n❌ Error during evaluation: {e}")
        import traceback
        traceback.print_exc()
"""

print("\n💡 To run the actual evaluation, uncomment the code at the bottom of this script")

