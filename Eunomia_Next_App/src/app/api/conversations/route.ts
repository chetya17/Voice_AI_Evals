import { NextRequest, NextResponse } from 'next/server';
import { ConversationService } from '@/lib/mongodbService';
import { getUserId, validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/conversations - Get all conversations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    let conversations;
    if (sessionId) {
      conversations = await ConversationService.getConversationsBySessionId(sessionId);
    } else {
      // For now, get by sessionId only - can be extended later
      conversations = [];
    }
    
    return NextResponse.json(createSuccessResponse(conversations));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch conversations', 500));
  }
}

// POST /api/conversations - Create conversations
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { sessionId, conversationId, testCase, messages, completed } = body;

    const validationError = validateRequiredFields(body, ['sessionId', 'conversationId', 'testCase', 'messages']);
    if (validationError) {
      return NextResponse.json(createErrorResponse(validationError, 400));
    }

    const conversationData = {
      userId,
      sessionId,
      conversationId,
      testCase,
      messages,
      completed: completed || false
    };

    const newConversation = await ConversationService.createConversation(conversationData);
    
    return NextResponse.json(createSuccessResponse(newConversation));
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(createErrorResponse('Failed to create conversation', 500));
  }
}