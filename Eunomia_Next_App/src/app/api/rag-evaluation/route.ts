import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { generateId } from '@/lib/mongodb';
import { evaluateRAGAS, RAGASMetric, generateCustomMetric, getAllMetrics } from '@/lib/ragasEvaluation';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 401 });
    }

    const { 
      question, 
      answer, 
      contexts, 
      groundTruth, 
      sessionId,
      testCaseId,
      metrics,
      customMetrics
    } = await request.json();

    if (!question || !answer || !contexts || !Array.isArray(contexts)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Question, answer, and contexts are required' 
      }, { status: 400 });
    }

    // Prepare metrics for evaluation
    let evaluationMetrics: RAGASMetric[] = [];
    
    // Add predefined metrics if specified
    if (metrics && Array.isArray(metrics)) {
      const allPredefinedMetrics = getAllMetrics();
      evaluationMetrics = allPredefinedMetrics.filter(metric => 
        metrics.includes(metric.name)
      );
    } else {
      // Use all predefined metrics by default
      evaluationMetrics = getAllMetrics();
    }
    
    // Add custom metrics if provided
    if (customMetrics && Array.isArray(customMetrics)) {
      for (const customMetric of customMetrics) {
        const generatedMetric = await generateCustomMetric(
          customMetric.name,
          customMetric.description,
          customMetric.category || 'custom',
          customMetric.prompt
        );
        evaluationMetrics.push(generatedMetric);
      }
    }

    // Perform RAGAS evaluation
    const evaluationResult = await evaluateRAGAS(
      question,
      answer,
      contexts,
      evaluationMetrics,
      groundTruth
    );

    // Store evaluation result in MongoDB
    const db = await getDatabase();
    const ragEvaluationsCollection = db.collection('rag_evaluations');

    const evaluationData = {
      _id: new ObjectId(),
      evaluationId: generateId('rag_eval'),
      userId,
      sessionId: sessionId || null,
      testCaseId: testCaseId || null,
      question,
      answer,
      contexts,
      groundTruth: groundTruth || null,
      metrics: evaluationMetrics.map(m => ({
        name: m.name,
        description: m.description,
        category: m.category,
        weight: m.weight
      })),
      scores: evaluationResult,
      createdAt: new Date()
    };

    await ragEvaluationsCollection.insertOne(evaluationData);

    return NextResponse.json({
      success: true,
      data: evaluationData
    });

  } catch (error) {
    console.error('Error performing RAG evaluation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform RAG evaluation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const db = await getDatabase();
    const ragEvaluationsCollection = db.collection('rag_evaluations');

    const query: any = { userId };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const evaluations = await ragEvaluationsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: evaluations
    });

  } catch (error) {
    console.error('Error fetching RAG evaluations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch RAG evaluations' },
      { status: 500 }
    );
  }
}
