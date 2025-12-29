import { NextRequest, NextResponse } from 'next/server';
import { TestCaseService } from '@/lib/mongodbService-simplified';
import { getUserId, validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/test-cases - Get all test cases for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    let testCases;
    if (sessionId) {
      testCases = await TestCaseService.getTestCasesBySessionId(sessionId);
    } else {
      testCases = await TestCaseService.getTestCasesByUserId(userId);
    }
    
    return NextResponse.json(createSuccessResponse(testCases));
  } catch (error) {
    console.error('Error fetching test cases:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch test cases', 500));
  }
}

// POST /api/test-cases - Create test cases
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { sessionId, testCases } = body;

    const validationError = validateRequiredFields(body, ['sessionId', 'testCases']);
    if (validationError) {
      return NextResponse.json(createErrorResponse(validationError, 400));
    }

    // Add userId to each test case
    const testCasesWithUserId = testCases.map((tc: any) => ({
      ...tc,
      userId,
      sessionId
    }));

    const newTestCases = await TestCaseService.createMultipleTestCases(testCasesWithUserId);
    
    return NextResponse.json(createSuccessResponse(newTestCases));
  } catch (error) {
    console.error('Error creating test cases:', error);
    return NextResponse.json(createErrorResponse('Failed to create test cases', 500));
  }
}
