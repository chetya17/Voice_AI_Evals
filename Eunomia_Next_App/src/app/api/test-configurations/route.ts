import { NextRequest, NextResponse } from 'next/server';
import { TestConfigurationService } from '@/lib/mongodbService';
import { getUserId, validateRequiredFields, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/test-configurations - Get all test configurations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    let testConfigurations;
    if (sessionId) {
      const config = await TestConfigurationService.getTestConfigurationBySessionId(sessionId);
      testConfigurations = config ? [config] : [];
    } else {
      // For now, get by sessionId only - can be extended later
      testConfigurations = [];
    }
    
    return NextResponse.json(createSuccessResponse(testConfigurations));
  } catch (error) {
    console.error('Error fetching test configurations:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch test configurations', 500));
  }
}

// POST /api/test-configurations - Create a new test configuration
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { sessionId, ...configData } = body;

    const validationError = validateRequiredFields(body, ['sessionId']);
    if (validationError) {
      return NextResponse.json(createErrorResponse(validationError, 400));
    }
    
    const testConfigurationData = {
      userId,
      sessionId,
      ...configData
    };

    const newTestConfiguration = await TestConfigurationService.createTestConfiguration(testConfigurationData);
    
    return NextResponse.json(createSuccessResponse(newTestConfiguration));
  } catch (error) {
    console.error('Error creating test configuration:', error);
    return NextResponse.json(createErrorResponse('Failed to create test configuration', 500));
  }
}
