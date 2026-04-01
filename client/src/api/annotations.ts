import client from './client';
import type { Annotation } from '@/types';

export async function fetchAnnotations(): Promise<Annotation[]> {
  const response = await client.get<Annotation[]>('annotations');
  return response.data;
}

export async function fetchAnnotation(id: number): Promise<Annotation> {
  const response = await client.get<Annotation>(`annotations/${id}`);
  return response.data;
}
