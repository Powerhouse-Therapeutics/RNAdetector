import client from './client';
import type { User } from '@/types';

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('auth/login', { email, password });
  return response.data;
}

export async function logout(): Promise<void> {
  await client.post('auth/logout');
}

export async function refresh(): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('auth/refresh');
  return response.data;
}

export async function me(): Promise<User> {
  const response = await client.get<User>('auth/me');
  return response.data;
}
