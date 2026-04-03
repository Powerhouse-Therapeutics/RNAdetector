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

/* --- Analysis Templates (saved configs) --- */

export interface AnalysisTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  parameters: Record<string, unknown>;
  user_id: number;
  created_at: string;
}

export async function listAnalysisTemplates(signal?: AbortSignal): Promise<AnalysisTemplate[]> {
  const { data } = await client.get('/analysis-templates', { signal });
  const result = data?.data ?? data;
  if (!Array.isArray(result)) return [];
  return result;
}

export async function saveAnalysisTemplate(
  template: { name: string; description: string; type: string; parameters: Record<string, unknown> },
): Promise<AnalysisTemplate> {
  const { data } = await client.post('/analysis-templates', template);
  return data?.data ?? data;
}

export async function deleteAnalysisTemplate(id: string): Promise<void> {
  await client.delete(`/analysis-templates/${id}`);
}
