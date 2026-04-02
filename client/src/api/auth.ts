import client from './client';
import type { User } from '@/types';

interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('auth/login', { email, password });
  const data = response.data;
  if (!data || !data.access_token) {
    throw new Error('Invalid login response from server.');
  }
  return data;
}

export async function logout(): Promise<void> {
  await client.post('auth/logout');
}

export async function refresh(): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('auth/refresh');
  const data = response.data;
  if (!data || !data.access_token) {
    throw new Error('Invalid refresh response from server.');
  }
  return data;
}

export async function me(): Promise<User> {
  const response = await client.get<User>('auth/me');
  const data = response.data;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid user response from server.');
  }
  return data;
}
