import client from './client';
import type { Reference } from '@/types';

export async function fetchReferences(): Promise<Reference[]> {
  const response = await client.get('references');
  const raw = response.data;
  return raw.data ?? raw;
}

export async function fetchReference(id: number): Promise<Reference> {
  const response = await client.get(`references/${id}`);
  return response.data?.data ?? response.data;
}

interface PackageInfo {
  name: string;
  species: string;
  genome_build: string;
  description: string;
  installed: boolean;
}

export async function fetchPackages(): Promise<PackageInfo[]> {
  const response = await client.get('references/packages');
  const raw = response.data;
  return raw.data ?? raw.packages ?? raw;
}
