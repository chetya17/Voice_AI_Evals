import { NextRequest, NextResponse } from 'next/server';
import { DatabaseIndexService } from '@/lib/databaseIndexes';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

// POST /api/setup-database - Create database indexes
export async function POST(request: NextRequest) {
  try {
    await DatabaseIndexService.createAllIndexes();
    
    return NextResponse.json(createSuccessResponse({
      message: 'Database indexes created successfully',
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error setting up database:', error);
    return NextResponse.json(createErrorResponse('Failed to setup database', 500));
  }
}

// GET /api/setup-database - Get database index information
export async function GET(request: NextRequest) {
  try {
    const indexStats = await DatabaseIndexService.getIndexStats();
    
    return NextResponse.json(createSuccessResponse({
      message: 'Database index information retrieved',
      indexStats,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error getting database info:', error);
    return NextResponse.json(createErrorResponse('Failed to get database information', 500));
  }
}
