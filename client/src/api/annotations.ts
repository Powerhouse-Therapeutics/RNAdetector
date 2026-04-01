import client from './client';
import type { Annotation } from '@/types';

export async function fetchAnnotations(): Promise<Annotation[]> {
  const response = await client.get('annotations');
  const raw = response.data;
  return raw.data ?? raw;
}

export async function fetchAnnotation(id: number): Promise<Annotation> {
  const response = await client.get(`annotations/${id}`);
  return response.data?.data ?? response.data;
}
