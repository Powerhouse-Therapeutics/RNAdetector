import client from './client';
import type { Reference } from '@/types';

export async function fetchReferences(): Promise<Reference[]> {
  const response = await client.get<Reference[]>('references');
  return response.data;
}

export async function fetchReference(id: number): Promise<Reference> {
  const response = await client.get<Reference>(`references/${id}`);
  return response.data;
}

interface PackageInfo {
  name: string;
  species: string;
  genome_build: string;
  description: string;
  installed: boolean;
}

export async function fetchPackages(): Promise<PackageInfo[]> {
  const response = await client.get<PackageInfo[]>('references/packages');
  return response.data;
}
