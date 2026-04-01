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
  const response = await client.get<PaginatedResponse<Job>>('jobs', { params });
  return response.data;
}

export async function fetchJob(id: number): Promise<Job> {
  const response = await client.get<Job>(`jobs/${id}`);
  return response.data;
}

export async function createJob(data: Partial<Job>): Promise<Job> {
  const response = await client.post<Job>('jobs', data);
  return response.data;
}

export async function submitJob(id: number): Promise<Job> {
  const response = await client.post<Job>(`jobs/${id}/submit`);
  return response.data;
}

export async function deleteJob(id: number): Promise<void> {
  await client.delete(`jobs/${id}`);
}

export async function fetchJobTypes(): Promise<string[]> {
  const response = await client.get<string[]>('jobs/types');
  return response.data;
}
