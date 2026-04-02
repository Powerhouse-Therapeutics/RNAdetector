import client from './client';

export async function getReport(jobId: number, signal?: AbortSignal): Promise<string> {
  const response = await client.get(`jobs/${jobId}/report`, {
    responseType: 'text',
    signal,
  });
  return typeof response.data === 'string' ? response.data : '';
}

export async function getReportStatus(
  jobId: number,
  signal?: AbortSignal,
): Promise<{ available: boolean; generating: boolean }> {
  const response = await client.get(`jobs/${jobId}/report/status`, { signal });
  const data = response.data;
  if (!data || typeof data !== 'object') {
    return { available: false, generating: false };
  }
  return {
    available: Boolean(data.available),
    generating: Boolean(data.generating),
  };
}

export async function generateReport(jobId: number): Promise<void> {
  await client.post(`jobs/${jobId}/report/generate`);
}
