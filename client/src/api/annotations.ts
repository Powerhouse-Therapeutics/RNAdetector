import client from './client';
import type { Annotation } from '@/types';

export async function fetchAnnotations(signal?: AbortSignal): Promise<Annotation[]> {
  const response = await client.get('annotations', { signal });
  const raw = response.data;
  if (!raw) return [];
  const result = raw.data ?? raw;
  return Array.isArray(result) ? result : [];
}

export async function fetchAnnotation(id: number, signal?: AbortSignal): Promise<Annotation> {
  const response = await client.get(`annotations/${id}`, { signal });
  const data = response.data?.data ?? response.data;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid annotation response from server.');
  }
  return data;
}
