import client from './client';
import type { ServerStatus } from '@/types';

export async function getServerStatus(signal?: AbortSignal): Promise<ServerStatus | null> {
  const { data } = await client.get('/server/status', { signal });
  const result = data?.data ?? data;
  if (!result || typeof result !== 'object') return null;
  return result as ServerStatus;
}

export async function checkDiskSpace(signal?: AbortSignal): Promise<{ warning: boolean; freeGb: number }> {
  const status = await getServerStatus(signal);
  if (!status || status.disk_warning == null) {
    return { warning: false, freeGb: -1 };
  }
  return { warning: !!status.disk_warning, freeGb: status.disk_free_gb ?? -1 };
}

export async function getPackages(signal?: AbortSignal) {
  const { data } = await client.get('/server/packages', { signal });
  if (!data || typeof data !== 'object') return [];
  // Handle various response shapes: { data: [...] }, { data: { packages: [...] } }, or [...]
  const inner = data.data ?? data;
  if (Array.isArray(inner)) return inner;
  if (inner && typeof inner === 'object' && Array.isArray(inner.packages)) return inner.packages;
  return [];
}

export async function installPackage(name: string) {
  const { data } = await client.post(`/server/packages/${name}/install`);
  return data;
}

export async function getInstallProgress(name: string, signal?: AbortSignal) {
  const { data } = await client.get(`/server/packages/${name}/status`, { signal });
  if (!data || typeof data !== 'object') {
    return { status: 'error', progress: 0, message: 'Invalid response' };
  }
  return data;
}
