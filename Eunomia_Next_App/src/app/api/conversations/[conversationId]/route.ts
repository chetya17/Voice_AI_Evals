import { NextRequest, NextResponse } from 'next/server';
import { ConversationService } from '@/lib/mongodbService';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/conversations/[conversationId] - Get a specific conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json(createErrorResponse('Conversation ID is required', 400), { status: 400 });
    }

    const conversation = await ConversationService.getConversationById(conversationId);
    
    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 404), { status: 404 });
    }

    return NextResponse.json(createSuccessResponse(conversation));
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch conversation', 500), { status: 500 });
  }
}

// PUT /api/conversations/[conversationId] - Update a conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const body = await request.json();

    if (!conversationId) {
      return NextResponse.json(createErrorResponse('Conversation ID is required', 400), { status: 400 });
    }

    const updatedConversation = await ConversationService.updateConversation(conversationId, body);
    
    if (!updatedConversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 404), { status: 404 });
    }

    return NextResponse.json(createSuccessResponse(updatedConversation));
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(createErrorResponse('Failed to update conversation', 500), { status: 500 });
  }
}

// DELETE /api/conversations/[conversationId] - Delete a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json(createErrorResponse('Conversation ID is required', 400), { status: 400 });
    }

    // For now, conversations are typically immutable
    // In the future, you might want to implement delete functionality
    return NextResponse.json(createErrorResponse('Conversations cannot be deleted', 400), { status: 400 });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(createErrorResponse('Failed to delete conversation', 500), { status: 500 });
  }
}
