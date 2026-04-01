export interface User {
  id: number;
  name: string;
  email: string;
  admin: boolean;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'ready' | 'queued' | 'processing' | 'completed' | 'failed';

export type JobType =
  | 'long_rna'
  | 'small_rna'
  | 'circ_rna'
  | 'sample_group'
  | 'diff_expr'
  | 'pathway';

export interface Job {
  id: number;
  name: string;
  type: JobType;
  status: JobStatus;
  user_id: number;
  parameters: Record<string, unknown>;
  output: Record<string, unknown> | null;
  log: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface Reference {
  id: number;
  name: string;
  species: string;
  genome_build: string;
  source: string;
  path: string;
  installed: boolean;
  created_at: string;
}

export interface Annotation {
  id: number;
  name: string;
  type: string;
  species: string;
  reference_id: number;
  path: string;
  created_at: string;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  type: JobType;
  parameters: Record<string, unknown>;
  user_id: number;
  created_at: string;
}

export interface ServerStatus {
  version: string;
  cores: number;
  total_memory_gb: number;
  available_memory_gb: number;
  used_cores: number;
  docker_running: boolean;
  uptime: string;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified_at: string;
}

export interface Volume {
  id: number;
  name: string;
  path: string;
  type: 'local' | 'remote';
  writable: boolean;
}

export interface ResourceRecommendation {
  min_threads: number;
  rec_threads: number;
  min_mem_gb: number;
  rec_mem_gb: number;
}
