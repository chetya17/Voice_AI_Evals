import { NextRequest, NextResponse } from 'next/server';
import { SessionService, getCompleteSessionData } from '@/lib/mongodbService-simplified';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/sessions-simplified/[sessionId] - Get a specific session with complete data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(createErrorResponse('Session ID is required', 400));
    }

    const completeSessionData = await getCompleteSessionData(sessionId);
    
    if (!completeSessionData.session) {
      return NextResponse.json(createErrorResponse('Session not found', 404));
    }

    return NextResponse.json(createSuccessResponse(completeSessionData));
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch session', 500));
  }
}

// PUT /api/sessions-simplified/[sessionId] - Update a session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    if (!sessionId) {
      return NextResponse.json(createErrorResponse('Session ID is required', 400));
    }

    const updatedSession = await SessionService.updateSession(sessionId, body);
    
    if (!updatedSession) {
      return NextResponse.json(createErrorResponse('Session not found', 404));
    }

    return NextResponse.json(createSuccessResponse(updatedSession));
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(createErrorResponse('Failed to update session', 500));
  }
}

// DELETE /api/sessions-simplified/[sessionId] - Delete a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(createErrorResponse('Session ID is required', 400));
    }

    const deleted = await SessionService.deleteSession(sessionId);
    
    if (!deleted) {
      return NextResponse.json(createErrorResponse('Session not found', 404));
    }

    return NextResponse.json(createSuccessResponse({ message: 'Session deleted successfully' }));
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(createErrorResponse('Failed to delete session', 500));
  }
}
