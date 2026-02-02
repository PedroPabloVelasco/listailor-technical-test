import { NextResponse } from 'next/server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  const { candidateId } = await params;

  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { message: 'API_BASE_URL is not configured' },
      { status: 500 },
    );
  }

  const res = await fetch(`${baseUrl}/candidates/${candidateId}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
