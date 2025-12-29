import { NextRequest, NextResponse } from 'next/server';
import { ScoringMetricService } from '@/lib/mongodbService-simplified';
import { getUserId, validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/scoring-metrics - Get all scoring metrics for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    let metrics;
    if (sessionId) {
      metrics = await ScoringMetricService.getScoringMetricsBySessionId(sessionId);
    } else {
      metrics = await ScoringMetricService.getScoringMetricsByUserId(userId);
    }
    
    return NextResponse.json(createSuccessResponse(metrics));
  } catch (error) {
    console.error('Error fetching scoring metrics:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch scoring metrics', 500));
  }
}

// POST /api/scoring-metrics - Create scoring metrics
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { sessionId, metrics } = body;

    const validationError = validateRequiredFields(body, ['sessionId', 'metrics']);
    if (validationError) {
      return NextResponse.json(createErrorResponse(validationError, 400));
    }

    // Add userId to each metric
    const metricsWithUserId = metrics.map((m: any) => ({
      ...m,
      userId,
      sessionId
    }));

    const newMetrics = await ScoringMetricService.createMultipleScoringMetrics(metricsWithUserId);
    
    return NextResponse.json(createSuccessResponse(newMetrics));
  } catch (error) {
    console.error('Error creating scoring metrics:', error);
    return NextResponse.json(createErrorResponse('Failed to create scoring metrics', 500));
  }
}