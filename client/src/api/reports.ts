import client from './client';

export async function getReport(jobId: number): Promise<string> {
  const response = await client.get(`jobs/${jobId}/report`, { responseType: 'text' });
  return typeof response.data === 'string' ? response.data : '';
}

export async function getReportStatus(jobId: number): Promise<{ available: boolean; generating: boolean }> {
  const response = await client.get(`jobs/${jobId}/report/status`);
  return response.data;
}

export async function generateReport(jobId: number): Promise<void> {
  await client.post(`jobs/${jobId}/report/generate`);
}
