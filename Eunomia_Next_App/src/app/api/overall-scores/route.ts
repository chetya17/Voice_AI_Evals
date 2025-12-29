import { NextRequest, NextResponse } from 'next/server';
import { OverallScoresService } from '@/lib/mongodbService-simplified';
import { getUserId, validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/overall-scores - Get overall scores for a session
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(createErrorResponse('Session ID is required', 400));
    }
    
    const overallScores = await OverallScoresService.getOverallScoresBySessionId(sessionId);
    
    return NextResponse.json(createSuccessResponse(overallScores));
  } catch (error) {
    console.error('Error fetching overall scores:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch overall scores', 500));
  }
}

// POST /api/overall-scores - Create or update overall scores
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { sessionId, scores } = body;

    const validationError = validateRequiredFields(body, ['sessionId', 'scores']);
    if (validationError) {
      return NextResponse.json(createErrorResponse(validationError, 400));
    }

    // Check if overall scores already exist for this session
    const existingScores = await OverallScoresService.getOverallScoresBySessionId(sessionId);
    
    let result;
    if (existingScores) {
      // Update existing scores
      result = await OverallScoresService.updateOverallScores(sessionId, scores);
    } else {
      // Create new scores
      result = await OverallScoresService.createOverallScores({
        userId,
        sessionId,
        ...scores
      });
    }
    
    return NextResponse.json(createSuccessResponse(result));
  } catch (error) {
    console.error('Error creating/updating overall scores:', error);
    return NextResponse.json(createErrorResponse('Failed to create/update overall scores', 500));
  }
}
