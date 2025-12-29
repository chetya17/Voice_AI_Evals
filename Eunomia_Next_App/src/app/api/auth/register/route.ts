import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { CreateUserRequest, AuthResponse } from '@/types/user';

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    const { email, username, password } = body;

    // Validate input
    if (!email || !username || !password) {
      return NextResponse.json<AuthResponse>({
        success: false,
        message: 'Email, username, and password are required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json<AuthResponse>({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json<AuthResponse>({
        success: false,
        message: 'Password must be at least 6 characters long'
      }, { status: 400 });
    }

    // Import MongoDB connection
    const { getUsersCollection } = await import('@/lib/mongodb');
    const usersCollection = await getUsersCollection();

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return NextResponse.json<AuthResponse>({
        success: false,
        message: 'User with this email or username already exists'
      }, { status: 409 });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = {
      email,
      username,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      role: 'user' as const
    };

    const result = await usersCollection.insertOne(newUser);

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json<AuthResponse>({
      success: true,
      user: {
        ...userWithoutPassword,
        _id: result.insertedId.toString()
      },
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error details:', errorMessage);
    
    return NextResponse.json<AuthResponse>({
      success: false,
      message: `Registration failed: ${errorMessage}`
    }, { status: 500 });
  }
}
