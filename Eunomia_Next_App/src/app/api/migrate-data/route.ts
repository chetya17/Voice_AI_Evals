import { NextRequest, NextResponse } from 'next/server';
import { DataMigrationService } from '@/lib/migration';
import { getUserId, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// POST /api/migrate-data - Migrate localStorage data to MongoDB
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { clearLocalStorage = false } = body;

    // Check if there's data to migrate
    if (!DataMigrationService.hasLocalStorageData()) {
      return NextResponse.json(createSuccessResponse({
        message: 'No localStorage data found to migrate',
        migratedSessions: 0,
        failedSessions: [],
        localStorageCleared: false
      }));
    }

    // Perform migration
    const result = await DataMigrationService.performMigration(userId, clearLocalStorage);

    return NextResponse.json(createSuccessResponse(result));
  } catch (error) {
    console.error('Error during data migration:', error);
    return NextResponse.json(createErrorResponse('Failed to migrate data', 500));
  }
}

// GET /api/migrate-data - Check if migration is needed
export async function GET(request: NextRequest) {
  try {
    const hasData = DataMigrationService.hasLocalStorageData();
    
    return NextResponse.json(createSuccessResponse({
      needsMigration: hasData,
      message: hasData ? 'LocalStorage data found that can be migrated' : 'No migration needed'
    }));
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(createErrorResponse('Failed to check migration status', 500));
  }
}
