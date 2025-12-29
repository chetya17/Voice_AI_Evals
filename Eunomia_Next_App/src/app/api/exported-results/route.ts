import { NextRequest, NextResponse } from 'next/server';
import { OverallScoresService } from '@/lib/mongodbService';
import { getUserId, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/exported-results - Get all exported results (overall scores) for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    let results;
    if (sessionId) {
      results = await OverallScoresService.getOverallScoresBySessionId(sessionId);
    } else {
      // For now, we'll return empty array since we don't have a method to get all overall scores by userId
      results = [];
    }
    
    return NextResponse.json(createSuccessResponse(results));
  } catch (error) {
    console.error('Error fetching exported results:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch exported results', 500), { status: 500 });
  }
}

// POST /api/exported-results - Create a new exported result (overall scores)
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { sessionId, metricOverallScores, sessionOverallScore, totalConversations, totalMetrics } = body;

    if (!sessionId || !metricOverallScores || !sessionOverallScore) {
      return NextResponse.json(createErrorResponse('Session ID, metric overall scores, and session overall score are required', 400), { status: 400 });
    }

    const resultData = {
      userId,
      sessionId,
      metricOverallScores,
      sessionOverallScore,
      totalConversations: totalConversations || 0,
      totalMetrics: totalMetrics || 0
    };

    const newResult = await OverallScoresService.createOverallScores(resultData);
    
    return NextResponse.json(createSuccessResponse(newResult));
  } catch (error) {
    console.error('Error creating exported result:', error);
    return NextResponse.json(createErrorResponse('Failed to create exported result', 500), { status: 500 });
  }
}
