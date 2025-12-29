import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/mongodbService';
import { getUserId, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/evaluation-workflows - Get all evaluation workflows (sessions) for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const sessions = await SessionService.getSessionsByUserId(userId);
    
    return NextResponse.json(createSuccessResponse(sessions));
  } catch (error) {
    console.error('Error fetching evaluation workflows:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch evaluation workflows', 500), { status: 500 });
  }
}

// POST /api/evaluation-workflows - Create a new evaluation workflow (session)
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { name, agentDescription } = body;

    if (!name || !agentDescription) {
      return NextResponse.json(createErrorResponse('Name and agent description are required', 400), { status: 400 });
    }

    const sessionData = {
      userId,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      agentDescription,
      status: 'configured' as const
    };

    const newSession = await SessionService.createSession(sessionData);
    
    return NextResponse.json(createSuccessResponse(newSession));
  } catch (error) {
    console.error('Error creating evaluation workflow:', error);
    return NextResponse.json(createErrorResponse('Failed to create evaluation workflow', 500), { status: 500 });
  }
}
