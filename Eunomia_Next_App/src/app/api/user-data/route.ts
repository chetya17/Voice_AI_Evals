import { NextRequest, NextResponse } from 'next/server';
import { getUserCompleteData } from '@/lib/mongodbService';

// GET /api/user-data - Get all data for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // TODO: Implement proper authentication
    // const session = await getServerSession();
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // For now, using a mock user ID - replace with actual auth
    const userId = 'mock-user-id';
    
    const userData = await getUserCompleteData(userId);
    
    return NextResponse.json({ 
      success: true, 
      data: userData 
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}
