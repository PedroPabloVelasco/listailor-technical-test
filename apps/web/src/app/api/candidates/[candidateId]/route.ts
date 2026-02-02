import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  const { candidateId } = await params;

  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: 'API_BASE_URL is not configured' }, { status: 500 });
  }

  const res = await fetch(`${baseUrl}/candidates/${candidateId}`, {
    method: 'GET',
    cache: 'no-store',
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
