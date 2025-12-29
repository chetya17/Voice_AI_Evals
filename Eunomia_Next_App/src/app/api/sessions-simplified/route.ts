import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/mongodbService-simplified';
import { getUserId, validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/sessions-simplified - Get all sessions for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const sessions = await SessionService.getSessionsByUserId(userId);
    
    return NextResponse.json(createSuccessResponse(sessions));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch sessions', 500));
  }
}

// POST /api/sessions-simplified - Create a new session
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { name, agentDescription } = body;

    const validationError = validateRequiredFields(body, ['name', 'agentDescription']);
    if (validationError) {
      return NextResponse.json(createErrorResponse(validationError, 400));
    }
    
    const sessionData = {
      userId,
      sessionId: `session_${Date.now()}`,
      name,
      agentDescription,
      status: 'configured' as const
    };

    const newSession = await SessionService.createSession(sessionData);
    
    return NextResponse.json(createSuccessResponse(newSession));
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(createErrorResponse('Failed to create session', 500));
  }
}
