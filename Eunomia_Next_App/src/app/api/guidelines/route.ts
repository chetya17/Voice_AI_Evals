import { NextRequest, NextResponse } from 'next/server';
import { GuidelineService } from '@/lib/mongodbService';
import { getUserId, validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/guidelines - Get all guidelines for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    let guidelines;
    if (sessionId) {
      guidelines = await GuidelineService.getGuidelinesBySessionId(sessionId);
    } else {
      // For now, get by sessionId only - can be extended later
      guidelines = [];
    }
    
    return NextResponse.json(createSuccessResponse(guidelines));
  } catch (error) {
    console.error('Error fetching guidelines:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch guidelines', 500));
  }
}

// POST /api/guidelines - Create guidelines
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { sessionId, guidelines } = body;

    const validationError = validateRequiredFields(body, ['sessionId', 'guidelines']);
    if (validationError) {
      return NextResponse.json(createErrorResponse(validationError, 400));
    }

    // Add userId to each guideline
    const guidelinesWithUserId = guidelines.map((g: any) => ({
      ...g,
      userId,
      sessionId
    }));

    const newGuidelines = await GuidelineService.createMultipleGuidelines(guidelinesWithUserId);
    
    return NextResponse.json(createSuccessResponse(newGuidelines));
  } catch (error) {
    console.error('Error creating guidelines:', error);
    return NextResponse.json(createErrorResponse('Failed to create guidelines', 500));
  }
}

// PUT /api/guidelines - Update a guideline
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { guidelineId, content, isEdited } = body;

    const validationError = validateRequiredFields(body, ['guidelineId', 'content']);
    if (validationError) {
      return NextResponse.json(createErrorResponse(validationError, 400));
    }

    const updatedGuideline = await GuidelineService.updateGuideline(guidelineId, {
      content,
      isEdited: isEdited || false
    });
    
    if (!updatedGuideline) {
      return NextResponse.json(createErrorResponse('Guideline not found', 404));
    }

    return NextResponse.json(createSuccessResponse(updatedGuideline));
  } catch (error) {
    console.error('Error updating guideline:', error);
    return NextResponse.json(createErrorResponse('Failed to update guideline', 500));
  }
}