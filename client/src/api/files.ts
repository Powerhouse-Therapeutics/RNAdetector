import client from './client';

export async function listVolumes() {
  const { data } = await client.get('/files/volumes');
  return data.data;
}

export async function browseDirectory(path: string) {
  const { data } = await client.get('/files/browse', { params: { path } });
  return data;
}

export async function searchFiles(path: string, pattern: string) {
  const { data } = await client.get('/files/search', { params: { path, pattern } });
  return data.data;
}
