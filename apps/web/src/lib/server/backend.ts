import 'server-only';
import { cookies } from 'next/headers';

export function getBackendBaseUrl() {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error('API_BASE_URL is not configured');
  }
  return baseUrl;
}

export async function backendGet<T>(path: string): Promise<T> {
  const baseUrl = getBackendBaseUrl();

  const headers = await buildAuthHeaders();
  const res = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Backend error ${res.status} for ${path}`);
  }

  return (await res.json()) as T;
}

export async function backendPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const baseUrl = getBackendBaseUrl();
  const headers = await buildAuthHeaders();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Backend error ${res.status} for ${path}: ${detail}`);
  }

  return (await res.json()) as T;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const jar = await cookies();
  const token = jar.get('session')?.value;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
