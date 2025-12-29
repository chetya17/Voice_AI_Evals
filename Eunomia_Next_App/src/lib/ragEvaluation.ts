import { openai } from './openai';

export interface RAGEvaluationResult {
  answerRelevancy: number;
  faithfulness: number;
  contextPrecision: number;
  contextRecall: number;
  contextRelevancy: number;
  overallScore: number;
  details: {
    answerRelevancy: {
      score: number;
      explanation: string;
    };
    faithfulness: {
      score: number;
      explanation: string;
    };
    contextPrecision: {
      score: number;
      explanation: string;
    };
    contextRecall: {
      score: number;
      explanation: string;
    };
    contextRelevancy: {
      score: number;
      explanation: string;
    };
  };
}

export interface RAGTestData {
  question: string;
  answer: string;
  contexts: string[];
  groundTruth?: string;
}

// Answer Relevancy - Measures how relevant the answer is to the question
export async function evaluateAnswerRelevancy(
  question: string,
  answer: string
): Promise<{ score: number; explanation: string }> {
  const prompt = `You are an expert evaluator. Rate the relevancy of the answer to the question on a scale of 0-1.

Question: ${question}
Answer: ${answer}

Consider:
- Does the answer directly address the question?
- Is the answer complete and comprehensive?
- Does the answer avoid irrelevant information?

Rate from 0 (completely irrelevant) to 1 (perfectly relevant).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      score: Math.max(0, Math.min(1, result.score || 0)),
      explanation: result.explanation || 'No explanation provided'
    };
  } catch (error) {
    console.error('Error evaluating answer relevancy:', error);
    return { score: 0, explanation: 'Error in evaluation' };
  }
}

// Faithfulness - Measures whether the answer is grounded in the provided contexts
export async function evaluateFaithfulness(
  answer: string,
  contexts: string[]
): Promise<{ score: number; explanation: string }> {
  const contextsText = contexts.join('\n\n');
  
  const prompt = `You are an expert evaluator. Rate the faithfulness of the answer to the provided contexts on a scale of 0-1.

Contexts:
${contextsText}

Answer: ${answer}

Consider:
- Does the answer contain any information not present in the contexts?
- Are all claims in the answer supported by the contexts?
- Does the answer avoid hallucination or fabrication?

Rate from 0 (completely unfaithful) to 1 (perfectly faithful).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      score: Math.max(0, Math.min(1, result.score || 0)),
      explanation: result.explanation || 'No explanation provided'
    };
  } catch (error) {
    console.error('Error evaluating faithfulness:', error);
    return { score: 0, explanation: 'Error in evaluation' };
  }
}

// Context Precision - Measures the precision of retrieved contexts
export async function evaluateContextPrecision(
  question: string,
  contexts: string[]
): Promise<{ score: number; explanation: string }> {
  const prompt = `You are an expert evaluator. Rate the precision of the retrieved contexts for answering the question on a scale of 0-1.

Question: ${question}

Contexts:
${contexts.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n\n')}

Consider:
- How many contexts are relevant to answering the question?
- Are irrelevant contexts included?
- What proportion of contexts are useful?

Rate from 0 (no relevant contexts) to 1 (all contexts are highly relevant).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      score: Math.max(0, Math.min(1, result.score || 0)),
      explanation: result.explanation || 'No explanation provided'
    };
  } catch (error) {
    console.error('Error evaluating context precision:', error);
    return { score: 0, explanation: 'Error in evaluation' };
  }
}

// Context Recall - Measures the recall of relevant information
export async function evaluateContextRecall(
  question: string,
  contexts: string[],
  groundTruth?: string
): Promise<{ score: number; explanation: string }> {
  const prompt = `You are an expert evaluator. Rate the recall of relevant information in the contexts for answering the question on a scale of 0-1.

Question: ${question}

Contexts:
${contexts.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n\n')}

${groundTruth ? `Ground Truth: ${groundTruth}` : ''}

Consider:
- Do the contexts contain sufficient information to answer the question?
- Is important information missing from the contexts?
- How complete is the coverage of relevant information?

Rate from 0 (insufficient information) to 1 (complete information coverage).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      score: Math.max(0, Math.min(1, result.score || 0)),
      explanation: result.explanation || 'No explanation provided'
    };
  } catch (error) {
    console.error('Error evaluating context recall:', error);
    return { score: 0, explanation: 'Error in evaluation' };
  }
}

// Context Relevancy - Measures the relevancy of retrieved contexts
export async function evaluateContextRelevancy(
  question: string,
  contexts: string[]
): Promise<{ score: number; explanation: string }> {
  const prompt = `You are an expert evaluator. Rate the relevancy of the retrieved contexts to the question on a scale of 0-1.

Question: ${question}

Contexts:
${contexts.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n\n')}

Consider:
- How relevant is each context to answering the question?
- Do the contexts provide useful information for the question?
- Are the contexts on-topic and helpful?

Rate from 0 (completely irrelevant) to 1 (perfectly relevant).

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "explanation": "<brief explanation of the score>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      score: Math.max(0, Math.min(1, result.score || 0)),
      explanation: result.explanation || 'No explanation provided'
    };
  } catch (error) {
    console.error('Error evaluating context relevancy:', error);
    return { score: 0, explanation: 'Error in evaluation' };
  }
}

// Main RAG evaluation function
export async function evaluateRAG(testData: RAGTestData): Promise<RAGEvaluationResult> {
  try {
    const [
      answerRelevancy,
      faithfulness,
      contextPrecision,
      contextRecall,
      contextRelevancy
    ] = await Promise.all([
      evaluateAnswerRelevancy(testData.question, testData.answer),
      evaluateFaithfulness(testData.answer, testData.contexts),
      evaluateContextPrecision(testData.question, testData.contexts),
      evaluateContextRecall(testData.question, testData.contexts, testData.groundTruth),
      evaluateContextRelevancy(testData.question, testData.contexts)
    ]);

    const overallScore = (
      answerRelevancy.score +
      faithfulness.score +
      contextPrecision.score +
      contextRecall.score +
      contextRelevancy.score
    ) / 5;

    return {
      answerRelevancy: answerRelevancy.score,
      faithfulness: faithfulness.score,
      contextPrecision: contextPrecision.score,
      contextRecall: contextRecall.score,
      contextRelevancy: contextRelevancy.score,
      overallScore,
      details: {
        answerRelevancy,
        faithfulness,
        contextPrecision,
        contextRecall,
        contextRelevancy
      }
    };
  } catch (error) {
    console.error('Error in RAG evaluation:', error);
    throw new Error('Failed to evaluate RAG performance');
  }
}
