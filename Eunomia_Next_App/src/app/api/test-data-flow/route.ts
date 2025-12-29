import { NextRequest, NextResponse } from 'next/server';
import { DataFlowTestService } from '@/lib/testDataFlow';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

// POST /api/test-data-flow - Run complete data flow test
export async function POST(request: NextRequest) {
  try {
    console.log('Starting data flow test...');
    const result = await DataFlowTestService.runCompleteTest();
    
    return NextResponse.json(createSuccessResponse({
      message: 'Data flow test completed',
      result,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error running data flow test:', error);
    return NextResponse.json(createErrorResponse('Failed to run data flow test', 500));
  }
}

// GET /api/test-data-flow - Run connectivity test
export async function GET(request: NextRequest) {
  try {
    const isConnected = await DataFlowTestService.runConnectivityTest();
    
    return NextResponse.json(createSuccessResponse({
      message: 'Connectivity test completed',
      connected: isConnected,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error running connectivity test:', error);
    return NextResponse.json(createErrorResponse('Failed to run connectivity test', 500));
  }
}
