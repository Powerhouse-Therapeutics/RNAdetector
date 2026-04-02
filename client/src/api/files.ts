import client from './client';
import type { FileEntry, Volume } from '@/types';

export async function listVolumes(signal?: AbortSignal): Promise<Volume[]> {
  const { data } = await client.get('/files/volumes', { signal });
  const result = data?.data ?? data;
  if (!Array.isArray(result)) return [];
  return result;
}

export async function browseDirectory(
  path: string,
  signal?: AbortSignal,
): Promise<{ data: FileEntry[] }> {
  const { data } = await client.get('/files/browse', { params: { path }, signal });
  if (!data || typeof data !== 'object') {
    return { data: [] };
  }
  // Normalize: ensure data.data is always an array
  const entries = data.data ?? data;
  return { data: Array.isArray(entries) ? entries : [] };
}

export async function searchFiles(
  path: string,
  pattern: string,
  signal?: AbortSignal,
): Promise<FileEntry[]> {
  const { data } = await client.get('/files/search', { params: { path, pattern }, signal });
  const result = data?.data ?? data;
  if (!Array.isArray(result)) return [];
  return result;
}
