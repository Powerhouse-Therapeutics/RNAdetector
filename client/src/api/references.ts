import client from './client';
import type { Reference } from '@/types';

export async function fetchReferences(signal?: AbortSignal): Promise<Reference[]> {
  const response = await client.get('references', { signal });
  const raw = response.data;
  if (!raw) return [];
  const result = raw.data ?? raw;
  return Array.isArray(result) ? result : [];
}

export async function fetchReference(id: number, signal?: AbortSignal): Promise<Reference> {
  const response = await client.get(`references/${id}`, { signal });
  const data = response.data?.data ?? response.data;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid reference response from server.');
  }
  return data;
}

interface PackageInfo {
  name: string;
  species: string;
  genome_build: string;
  description: string;
  installed: boolean;
}

export async function fetchPackages(signal?: AbortSignal): Promise<PackageInfo[]> {
  const response = await client.get('references/packages', { signal });
  const raw = response.data;
  if (!raw) return [];
  const result = raw.data ?? raw.packages ?? raw;
  return Array.isArray(result) ? result : [];
}
