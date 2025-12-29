import { NextRequest, NextResponse } from 'next/server';
import { TestConfigurationService } from '@/lib/mongodbService';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/test-configurations/[configId] - Get a specific test configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> }
) {
  try {
    const { configId } = await params;

    if (!configId) {
      return NextResponse.json(createErrorResponse('Test configuration ID is required', 400));
    }

    const testConfiguration = await TestConfigurationService.getTestConfigurationById(configId);
    
    if (!testConfiguration) {
      return NextResponse.json(createErrorResponse('Test configuration not found', 404));
    }

    return NextResponse.json(createSuccessResponse(testConfiguration));
  } catch (error) {
    console.error('Error fetching test configuration:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch test configuration', 500));
  }
}

// PUT /api/test-configurations/[configId] - Update a test configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> }
) {
  try {
    const { configId } = await params;
    const body = await request.json();

    if (!configId) {
      return NextResponse.json(createErrorResponse('Test configuration ID is required', 400));
    }

    const updatedTestConfiguration = await TestConfigurationService.updateTestConfiguration(configId, body);
    
    if (!updatedTestConfiguration) {
      return NextResponse.json(createErrorResponse('Test configuration not found', 404));
    }

    return NextResponse.json(createSuccessResponse(updatedTestConfiguration));
  } catch (error) {
    console.error('Error updating test configuration:', error);
    return NextResponse.json(createErrorResponse('Failed to update test configuration', 500));
  }
}

// DELETE /api/test-configurations/[configId] - Delete a test configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> }
) {
  try {
    const { configId } = await params;

    if (!configId) {
      return NextResponse.json(createErrorResponse('Test configuration ID is required', 400));
    }

    const deleted = await TestConfigurationService.deleteTestConfiguration(configId);
    
    if (!deleted) {
      return NextResponse.json(createErrorResponse('Test configuration not found', 404));
    }

    return NextResponse.json(createSuccessResponse({ message: 'Test configuration deleted successfully' }));
  } catch (error) {
    console.error('Error deleting test configuration:', error);
    return NextResponse.json(createErrorResponse('Failed to delete test configuration', 500));
  }
}
