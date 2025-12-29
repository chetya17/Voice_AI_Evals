import { NextRequest } from 'next/server';

// Simple authentication helper for development
// In production, this should be replaced with proper authentication (NextAuth, Auth0, etc.)
export function getUserId(request: NextRequest): string {
  // For development, we'll generate a unique user ID based on the request
  // In production, this should extract the user ID from the JWT token or session
  
  // Try to get user ID from headers first (for API calls)
  const userIdFromHeader = request.headers.get('x-user-id');
  if (userIdFromHeader) {
    return userIdFromHeader;
  }
  
  // Try to get user ID from cookies
  const userIdFromCookie = request.cookies.get('user-id')?.value;
  if (userIdFromCookie) {
    return userIdFromCookie;
  }
  
  // Generate a unique user ID based on IP and timestamp for this session
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const timestamp = Date.now();
  const uniqueId = `user_${ip.replace(/[^a-zA-Z0-9]/g, '')}_${timestamp}`;
  
  return uniqueId;
}

// Helper to validate required fields
export function validateRequiredFields(data: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return `${field} is required`;
    }
  }
  return null;
}

// Helper to create error responses
export function createErrorResponse(message: string, status: number = 400) {
  return {
    error: message,
    status
  };
}

// Helper to create success responses
export function createSuccessResponse(data: any) {
  return {
    success: true,
    data
  };
}
