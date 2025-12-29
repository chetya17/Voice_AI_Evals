export interface User {
  _id?: string;
  email: string;
  username: string;
  password: string; // This will be hashed
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  role: 'admin' | 'user';
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'password'>;
  token?: string;
  message?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
}
