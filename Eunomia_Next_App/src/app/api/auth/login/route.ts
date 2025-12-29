import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LoginRequest, AuthResponse } from '@/types/user';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json<AuthResponse>({
        success: false,
        message: 'Email and password are required'
      }, { status: 400 });
    }

    // Import MongoDB connection
    const { getUsersCollection } = await import('@/lib/mongodb');
    const usersCollection = await getUsersCollection();

    // Find user by email
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return NextResponse.json<AuthResponse>({
        success: false,
        message: 'Invalid email or password'
      }, { status: 401 });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json<AuthResponse>({
        success: false,
        message: 'Account is deactivated'
      }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json<AuthResponse>({
        success: false,
        message: 'Invalid email or password'
      }, { status: 401 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json<AuthResponse>({
      success: true,
      user: {
        ...userWithoutPassword,
        _id: user._id.toString()
      },
      token,
      message: 'Login successful'
    }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error details:', errorMessage);
    
    // Provide more helpful error messages for common MongoDB errors
    let userFriendlyMessage = errorMessage;
    if (errorMessage.includes('authentication failed') || errorMessage.includes('bad auth')) {
      userFriendlyMessage = 'MongoDB authentication failed. Please check your connection string credentials in .env.local. Make sure special characters in the password are URL-encoded.';
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      userFriendlyMessage = 'Cannot connect to MongoDB. Please check your connection string and ensure your cluster is running.';
    } else if (errorMessage.includes('IP')) {
      userFriendlyMessage = 'Your IP address is not whitelisted. Please add it in MongoDB Atlas Network Access.';
    }
    
    return NextResponse.json<AuthResponse>({
      success: false,
      message: `Login failed: ${userFriendlyMessage}`
    }, { status: 500 });
  }
}
