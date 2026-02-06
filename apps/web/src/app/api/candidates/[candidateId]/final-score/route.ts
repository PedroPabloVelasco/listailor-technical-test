import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';

export async function PUT(req: Request, ctx: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await ctx.params;
  const body = (await req.json()) as { finalScore?: number };

  if (typeof body?.finalScore !== 'number' || Number.isNaN(body.finalScore)) {
    return NextResponse.json({ message: 'finalScore must be a number' }, { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get('session')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Missing session cookie' }, { status: 401 });
  }

  const upstream = await fetch(
    `${API_BASE}/candidates/${candidateId}/final-score`,
    {
      method: 'PUT',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Cookie: `session=${token}`,
      },
      body: JSON.stringify({ finalScore: body.finalScore }),
    },
  );

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
