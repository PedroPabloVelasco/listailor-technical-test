import 'server-only';

export function getBackendBaseUrl() {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error('API_BASE_URL is not configured');
  }
  return baseUrl;
}

export async function backendGet<T>(path: string): Promise<T> {
  const baseUrl = getBackendBaseUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    // next: { revalidate: 0 }, // opcional
  });

  if (!res.ok) {
    throw new Error(`Backend error ${res.status} for ${path}`);
  }

  return (await res.json()) as T;
}
