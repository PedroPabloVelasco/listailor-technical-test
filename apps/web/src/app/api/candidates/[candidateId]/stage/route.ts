import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  const { candidateId } = await params;
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: 'API_BASE_URL is not configured' }, { status: 500 });
  }

  const jar = await cookies();
  const token = jar.get('session')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Missing session cookie' }, { status: 401 });
  }
  const body = await req.text();

  const res = await fetch(`${baseUrl}/candidates/${candidateId}/stage`, {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Cookie: `session=${token}`,
    },
    body,
  });

  const payload = await res.text();
  return new NextResponse(payload, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
