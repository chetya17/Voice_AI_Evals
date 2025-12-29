import { NextRequest, NextResponse } from 'next/server';
import { ConversationScoreService } from '@/lib/mongodbService';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/scores/[scoreId] - Get a specific conversation score
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scoreId: string }> }
) {
  try {
    const { scoreId } = await params;

    if (!scoreId) {
      return NextResponse.json(createErrorResponse('Score ID is required', 400), { status: 400 });
    }

    const score = await ConversationScoreService.getConversationScoreById(scoreId);
    
    if (!score) {
      return NextResponse.json(createErrorResponse('Score not found', 404), { status: 404 });
    }

    return NextResponse.json(createSuccessResponse(score));
  } catch (error) {
    console.error('Error fetching conversation score:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch conversation score', 500), { status: 500 });
  }
}

// PUT /api/scores/[scoreId] - Update a conversation score
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ scoreId: string }> }
) {
  try {
    const { scoreId } = await params;
    const body = await request.json();

    if (!scoreId) {
      return NextResponse.json(createErrorResponse('Score ID is required', 400), { status: 400 });
    }

    // For now, conversation scores are typically immutable
    // In the future, you might want to implement update functionality
    return NextResponse.json(createErrorResponse('Conversation scores cannot be updated', 400), { status: 400 });
  } catch (error) {
    console.error('Error updating conversation score:', error);
    return NextResponse.json(createErrorResponse('Failed to update conversation score', 500), { status: 500 });
  }
}

// DELETE /api/scores/[scoreId] - Delete a conversation score
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ scoreId: string }> }
) {
  try {
    const { scoreId } = await params;

    if (!scoreId) {
      return NextResponse.json(createErrorResponse('Score ID is required', 400), { status: 400 });
    }

    // For now, conversation scores are typically immutable
    // In the future, you might want to implement delete functionality
    return NextResponse.json(createErrorResponse('Conversation scores cannot be deleted', 400), { status: 400 });
  } catch (error) {
    console.error('Error deleting conversation score:', error);
    return NextResponse.json(createErrorResponse('Failed to delete conversation score', 500), { status: 500 });
  }
}
