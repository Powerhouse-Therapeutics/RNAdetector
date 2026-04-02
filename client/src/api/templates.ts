import client from './client';
import type { Template } from '@/types';

export async function listTemplates(signal?: AbortSignal): Promise<Template[]> {
  const { data } = await client.get('/templates', { signal });
  const result = data?.data ?? data;
  if (!Array.isArray(result)) return [];
  return result;
}

export async function downloadTemplate(name: string): Promise<void> {
  const response = await client.get(`/templates/${name}/download`, { responseType: 'blob' });
  if (!response.data) {
    throw new Error('Empty response when downloading template.');
  }
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.tsv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
