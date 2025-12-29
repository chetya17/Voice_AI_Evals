import { NextRequest, NextResponse } from 'next/server';
import { ConversationScoreService } from '@/lib/mongodbService';
import { getUserId, validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/scores - Get all conversation scores for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    let scores;
    if (sessionId) {
      scores = await ConversationScoreService.getConversationScoresBySessionId(sessionId);
    } else {
      // For now, get by sessionId only - can be extended later
      scores = [];
    }
    
    return NextResponse.json(createSuccessResponse(scores));
  } catch (error) {
    console.error('Error fetching conversation scores:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch conversation scores', 500));
  }
}

// POST /api/scores - Create conversation scores
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { sessionId, conversationId, testCase, metricScores, averageScore } = body;

    const validationError = validateRequiredFields(body, ['sessionId', 'conversationId', 'testCase', 'metricScores', 'averageScore']);
    if (validationError) {
      return NextResponse.json(createErrorResponse(validationError, 400));
    }

    const scoreData = {
      userId,
      sessionId,
      conversationId,
      testCase,
      metricScores,
      averageScore
    };

    const newScore = await ConversationScoreService.createConversationScore(scoreData);
    
    return NextResponse.json(createSuccessResponse(newScore));
  } catch (error) {
    console.error('Error creating conversation score:', error);
    return NextResponse.json(createErrorResponse('Failed to create conversation score', 500));
  }
}