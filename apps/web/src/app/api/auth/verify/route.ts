import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = body.token as string;

  if (!token) {
    return NextResponse.json(
      { error: 'Token no proporcionado' },
      { status: 400 }
    );
  }

  try {
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) {
      throw new Error('API_BASE_URL is not configured');
    }

    const res = await fetch(`${baseUrl}/auth/magic-link/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: detail || 'No fue posible iniciar sesión' },
        { status: res.status }
      );
    }

    const session = (await res.json()) as {
      token: string;
      expiresAt: string;
    };

    const response = NextResponse.json({ success: true, session });

    response.cookies.set({
      name: 'session',
      value: session.token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(session.expiresAt),
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
