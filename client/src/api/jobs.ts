import client from './client';
import type { Job } from '@/types';

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface JobSorting {
  field: string;
  direction: 'asc' | 'desc';
}

export async function fetchJobs(
  page = 1,
  perPage = 15,
  sorting?: JobSorting
): Promise<PaginatedResponse<Job>> {
  const params: Record<string, unknown> = { page, per_page: perPage };
  if (sorting) {
    params.sort_by = sorting.field;
    params.sort_dir = sorting.direction;
  }
  const response = await client.get('jobs', { params });
  const raw = response.data;
  return {
    data: raw.data ?? [],
    current_page: raw.meta?.current_page ?? raw.current_page ?? 1,
    last_page: raw.meta?.last_page ?? raw.last_page ?? 1,
    per_page: raw.meta?.per_page ?? raw.per_page ?? perPage,
    total: raw.meta?.total ?? raw.total ?? 0,
  };
}

export async function fetchJob(id: number): Promise<Job> {
  const response = await client.get(`jobs/${id}`);
  return response.data?.data ?? response.data;
}

export async function createJob(data: Partial<Job>): Promise<Job> {
  const response = await client.post('jobs', data);
  return response.data?.data ?? response.data;
}

export async function submitJob(id: number): Promise<Job> {
  const response = await client.get(`jobs/${id}/submit`);
  return response.data?.data ?? response.data;
}

export async function deleteJob(id: number): Promise<void> {
  await client.delete(`jobs/${id}`);
}

export async function fetchJobTypes(): Promise<string[]> {
  const response = await client.get('job-types');
  const raw = response.data?.data ?? response.data;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object' && raw !== null) return Object.keys(raw);
  return [];
}
