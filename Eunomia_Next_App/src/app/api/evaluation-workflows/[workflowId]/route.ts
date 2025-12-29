import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/mongodbService';
import { getUserId, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/evaluation-workflows/[workflowId] - Get a specific evaluation workflow (session)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;

    if (!workflowId) {
      return NextResponse.json(createErrorResponse('Workflow ID is required', 400), { status: 400 });
    }

    const session = await SessionService.getSessionById(workflowId);
    
    if (!session) {
      return NextResponse.json(createErrorResponse('Workflow not found', 404), { status: 404 });
    }

    return NextResponse.json(createSuccessResponse(session));
  } catch (error) {
    console.error('Error fetching evaluation workflow:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch evaluation workflow', 500), { status: 500 });
  }
}

// PUT /api/evaluation-workflows/[workflowId] - Update an evaluation workflow (session)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const userId = getUserId(request);
    const { workflowId } = await params;
    const body = await request.json();

    if (!workflowId) {
      return NextResponse.json(createErrorResponse('Workflow ID is required', 400), { status: 400 });
    }

    // Check if session exists and belongs to user
    const existingSession = await SessionService.getSessionById(workflowId);
    if (!existingSession) {
      return NextResponse.json(createErrorResponse('Workflow not found', 404), { status: 404 });
    }

    if (existingSession.userId !== userId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 403), { status: 403 });
    }

    const updatedSession = await SessionService.updateSession(workflowId, body);
    
    if (!updatedSession) {
      return NextResponse.json(createErrorResponse('Failed to update workflow', 500), { status: 500 });
    }

    return NextResponse.json(createSuccessResponse(updatedSession));
  } catch (error) {
    console.error('Error updating evaluation workflow:', error);
    return NextResponse.json(createErrorResponse('Failed to update evaluation workflow', 500), { status: 500 });
  }
}

// DELETE /api/evaluation-workflows/[workflowId] - Delete an evaluation workflow (session)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const userId = getUserId(request);
    const { workflowId } = await params;

    if (!workflowId) {
      return NextResponse.json(createErrorResponse('Workflow ID is required', 400), { status: 400 });
    }

    // Check if session exists and belongs to user
    const existingSession = await SessionService.getSessionById(workflowId);
    if (!existingSession) {
      return NextResponse.json(createErrorResponse('Workflow not found', 404), { status: 404 });
    }

    if (existingSession.userId !== userId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 403), { status: 403 });
    }

    const deleted = await SessionService.deleteSession(workflowId);
    
    if (!deleted) {
      return NextResponse.json(createErrorResponse('Failed to delete workflow', 500), { status: 500 });
    }

    return NextResponse.json(createSuccessResponse({ message: 'Workflow deleted successfully' }));
  } catch (error) {
    console.error('Error deleting evaluation workflow:', error);
    return NextResponse.json(createErrorResponse('Failed to delete evaluation workflow', 500), { status: 500 });
  }
}
