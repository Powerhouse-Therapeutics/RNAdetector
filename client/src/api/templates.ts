import client from './client';

export async function listTemplates() {
  const { data } = await client.get('/templates');
  return data.data;
}

export async function downloadTemplate(name: string) {
  const response = await client.get(`/templates/${name}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.tsv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
