import { NextResponse } from 'next/server';
import { getBackendBaseUrl } from '@/lib/server/backend';

export async function POST(request: Request) {
  const body = await request.json();
  const baseUrl = getBackendBaseUrl();

  const res = await fetch(`${baseUrl}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
