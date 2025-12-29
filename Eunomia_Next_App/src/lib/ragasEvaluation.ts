import { getTextModel } from './gemini';

export interface RAGASMetric {
  name: string;
  description: string;
  category: 'answer_quality' | 'context_quality' | 'faithfulness' | 'custom';
  weight: number;
  prompt: string;
}

export interface RAGASEvaluationResult {
  metricName: string;
  score: number;
  explanation: string;
  details?: any;
}

export interface RAGASFullResult {
  [metricName: string]: RAGASEvaluationResult;
  overallScore: number;
}

// Predefined RAGAS metrics
export const PREDEFINED_RAGAS_METRICS: RAGASMetric[] = [
  {
    name: 'answer_relevancy',
    description: 'Measures how relevant the answer is to the question',
    category: 'answer_quality',
    weight: 1.0,
    prompt: `You are an expert evaluator. Rate the relevancy of the answer to the question on a scale of 0-1.

Question: {question}
Answer: {answer}

Consider:
- Does the answer directly address the question?
- Is the answer complete and comprehensive?
- Does the answer avoid irrelevant information?

Rate from 0 (completely irrelevant) to 1 (perfectly relevant).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`
  },
  {
    name: 'faithfulness',
    description: 'Measures whether the answer is grounded ONLY in the provided contexts',
    category: 'faithfulness',
    weight: 1.0,
    prompt: `You are an expert evaluator for RAG (Retrieval-Augmented Generation) systems. Rate the faithfulness of the answer to the provided contexts on a scale of 0-1.

Contexts:
{contexts}

Answer: {answer}

CRITICAL EVALUATION CRITERIA:
- The answer must be based EXCLUSIVELY on the provided contexts
- Any information not directly derivable from the contexts should result in a lower score
- Check for hallucination, fabrication, or external knowledge not in the contexts
- Verify that all claims, facts, and statements can be traced back to the contexts
- Look for any additions, interpretations, or extrapolations beyond what's explicitly stated

STRICT SCORING:
- 1.0: Answer is 100% based on provided contexts, no external knowledge
- 0.8-0.9: Answer is mostly faithful with minor acceptable paraphrasing
- 0.6-0.7: Answer contains some information not in contexts but mostly faithful
- 0.4-0.5: Answer contains significant information not in contexts
- 0.0-0.3: Answer contains substantial external knowledge or hallucination

Rate from 0 (completely unfaithful) to 1 (perfectly faithful).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<detailed explanation of the score, highlighting any external knowledge or unfaithful elements>"
}`
  },
  {
    name: 'context_precision',
    description: 'Measures the precision of retrieved contexts',
    category: 'context_quality',
    weight: 1.0,
    prompt: `You are an expert evaluator. Rate the precision of the retrieved contexts for answering the question on a scale of 0-1.

Question: {question}

Contexts:
{contexts}

Consider:
- How many contexts are relevant to answering the question?
- Are irrelevant contexts included?
- What proportion of contexts are useful?

Rate from 0 (no relevant contexts) to 1 (all contexts are highly relevant).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`
  },
  {
    name: 'context_recall',
    description: 'Measures the recall of relevant information',
    category: 'context_quality',
    weight: 1.0,
    prompt: `You are an expert evaluator. Rate the recall of relevant information in the contexts for answering the question on a scale of 0-1.

Question: {question}

Contexts:
{contexts}

{groundTruth}

Consider:
- Do the contexts contain sufficient information to answer the question?
- Is important information missing from the contexts?
- How complete is the coverage of relevant information?

Rate from 0 (insufficient information) to 1 (complete information coverage).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`
  },
  {
    name: 'context_relevancy',
    description: 'Measures the relevancy of retrieved contexts',
    category: 'context_quality',
    weight: 1.0,
    prompt: `You are an expert evaluator. Rate the relevancy of the retrieved contexts to the question on a scale of 0-1.

Question: {question}

Contexts:
{contexts}

Consider:
- How relevant is each context to answering the question?
- Do the contexts provide useful information for the question?
- Are the contexts on-topic and helpful?

Rate from 0 (completely irrelevant) to 1 (perfectly relevant).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`
  },
  {
    name: 'answer_correctness',
    description: 'Measures the factual correctness of the answer',
    category: 'answer_quality',
    weight: 1.0,
    prompt: `You are an expert evaluator. Rate the factual correctness of the answer on a scale of 0-1.

Question: {question}
Answer: {answer}
Contexts: {contexts}

Consider:
- Is the answer factually accurate?
- Are there any errors or inaccuracies?
- Does the answer align with the provided contexts?

Rate from 0 (completely incorrect) to 1 (perfectly correct).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`
  },
  {
    name: 'answer_completeness',
    description: 'Measures how complete the answer is',
    category: 'answer_quality',
    weight: 1.0,
    prompt: `You are an expert evaluator. Rate the completeness of the answer on a scale of 0-1.

Question: {question}
Answer: {answer}
Contexts: {contexts}

Consider:
- Does the answer address all parts of the question?
- Is important information missing?
- How comprehensive is the response?

Rate from 0 (very incomplete) to 1 (completely comprehensive).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`
  },
  {
    name: 'strict_faithfulness',
    description: 'Strictly measures if answer contains ONLY information from provided contexts',
    category: 'faithfulness',
    weight: 1.0,
    prompt: `You are an expert RAG evaluator. This is a STRICT faithfulness check for RAG systems. Rate whether the answer contains ONLY information from the provided contexts on a scale of 0-1.

Contexts:
{contexts}

Answer: {answer}

STRICT EVALUATION RULES:
1. Every single fact, claim, or piece of information in the answer MUST be directly derivable from the contexts
2. Any external knowledge, assumptions, or information not in the contexts results in a score of 0
3. Even minor additions, interpretations, or extrapolations beyond the contexts should be penalized
4. The answer should be a direct synthesis of the provided contexts only

SCORING CRITERIA:
- 1.0: Answer contains ONLY information from contexts, perfect faithfulness
- 0.0: Answer contains ANY information not in contexts, even a single fact

This is a binary evaluation: either the answer is 100% faithful to contexts (1.0) or it contains external information (0.0).

Respond with a JSON object containing:
{
  "score": <0 or 1>,
  "explanation": "<detailed explanation of any external information found, or confirmation of perfect faithfulness>"
}`
  }
];

// Generate custom metric
export async function generateCustomMetric(
  name: string,
  description: string,
  category: RAGASMetric['category'],
  customPrompt: string
): Promise<RAGASMetric> {
  return {
    name: name.toLowerCase().replace(/\s+/g, '_'),
    description,
    category,
    weight: 1.0,
    prompt: customPrompt
  };
}

// Evaluate a single metric
export async function evaluateMetric(
  metric: RAGASMetric,
  question: string,
  answer: string,
  contexts: string[],
  groundTruth?: string
): Promise<RAGASEvaluationResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const model = getTextModel();
  
  // Replace placeholders in the prompt
  let prompt = metric.prompt
    .replace(/{question}/g, question)
    .replace(/{answer}/g, answer)
    .replace(/{contexts}/g, contexts.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n\n'))
    .replace(/{groundTruth}/g, groundTruth ? `Ground Truth: ${groundTruth}` : '');

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        metricName: metric.name,
        score: Math.max(0, Math.min(1, parsed.score || 0)),
        explanation: parsed.explanation || 'No explanation provided',
        details: { prompt, rawResponse: text }
      };
    } else {
      // Fallback if JSON parsing fails
      return {
        metricName: metric.name,
        score: 0.5,
        explanation: 'Could not parse evaluation result',
        details: { prompt, rawResponse: text }
      };
    }
  } catch (error) {
    console.error(`Error evaluating metric ${metric.name}:`, error);
    return {
      metricName: metric.name,
      score: 0,
      explanation: 'Error in evaluation',
      details: { error: error.message }
    };
  }
}

// Evaluate multiple metrics
export async function evaluateRAGAS(
  question: string,
  answer: string,
  contexts: string[],
  metrics: RAGASMetric[],
  groundTruth?: string
): Promise<RAGASFullResult> {
  const results: RAGASFullResult = {} as RAGASFullResult;
  
  // Evaluate each metric
  const evaluationPromises = metrics.map(metric => 
    evaluateMetric(metric, question, answer, contexts, groundTruth)
  );
  
  const evaluationResults = await Promise.all(evaluationPromises);
  
  // Process results
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  evaluationResults.forEach(result => {
    results[result.metricName] = result;
    
    const metric = metrics.find(m => m.name === result.metricName);
    if (metric) {
      totalWeightedScore += result.score * metric.weight;
      totalWeight += metric.weight;
    }
  });
  
  // Calculate overall score
  results.overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  
  return results;
}

// Get metrics by category
export function getMetricsByCategory(category: RAGASMetric['category']): RAGASMetric[] {
  return PREDEFINED_RAGAS_METRICS.filter(metric => metric.category === category);
}

// Get all available metrics
export function getAllMetrics(): RAGASMetric[] {
  return [...PREDEFINED_RAGAS_METRICS];
}
