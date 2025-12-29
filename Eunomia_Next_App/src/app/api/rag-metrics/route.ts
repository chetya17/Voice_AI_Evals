import { NextRequest, NextResponse } from 'next/server';
import { getAllMetrics, getMetricsByCategory, RAGASMetric } from '@/lib/ragasEvaluation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let metrics: RAGASMetric[];

    if (category) {
      metrics = getMetricsByCategory(category as any);
    } else {
      metrics = getAllMetrics();
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        categories: ['answer_quality', 'context_quality', 'faithfulness', 'custom'],
        total: metrics.length
      }
    });

  } catch (error) {
    console.error('Error fetching RAG metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch RAG metrics' },
      { status: 500 }
    );
  }
}
