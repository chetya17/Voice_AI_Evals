import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { AuthResponse, SessionUser } from '@/types/user';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<AuthResponse>({
        success: false,
        message: 'No token provided'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      // Lazy load MongoDB connection to avoid build-time issues
      const { getUsersCollectionLazy } = await import('@/lib/mongodb-lazy');
      const usersCollection = await getUsersCollectionLazy();
      
      const user = await usersCollection.findOne(
        { _id: decoded.userId },
        { projection: { password: 0 } }
      );

      if (!user || !user.isActive) {
        return NextResponse.json<AuthResponse>({
          success: false,
          message: 'User not found or inactive'
        }, { status: 401 });
      }

      return NextResponse.json<AuthResponse>({
        success: true,
        user: {
          ...user,
          _id: user._id.toString()
        }
      }, { status: 200 });

    } catch (jwtError) {
      return NextResponse.json<AuthResponse>({
        success: false,
        message: 'Invalid token'
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json<AuthResponse>({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
