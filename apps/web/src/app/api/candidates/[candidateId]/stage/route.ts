import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';

type Params = { candidateId: string };

export async function PATCH(req: Request, ctx: { params: Promise<Params> }) {
  const { candidateId } = await ctx.params;
  const body = (await req.json()) as { stage?: string };

  if (!body?.stage) {
    return NextResponse.json({ message: 'stage is required' }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE}/candidates/${candidateId}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: body.stage }),
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
