import client from './client';

export async function getServerStatus() {
  const { data } = await client.get('/server/status');
  return data.data;
}

export async function getPackages() {
  const { data } = await client.get('/server/packages');
  return data;
}

export async function installPackage(name: string) {
  const { data } = await client.post(`/server/packages/${name}/install`);
  return data;
}

export async function getInstallProgress(name: string) {
  const { data } = await client.get(`/server/packages/${name}/status`);
  return data;
}
