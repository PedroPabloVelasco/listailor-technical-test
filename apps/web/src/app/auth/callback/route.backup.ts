import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Este endpoint ya no se usa - ver page.tsx para el flujo de autenticación
// Se mantiene solo por compatibilidad legacy

async function exchangeToken(token: string) {
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
    throw new Error(detail || 'No fue posible iniciar sesión');
  }

  return (await res.json()) as { token: string; expiresAt: string };
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const token = url.searchParams.get('token');

  if (!token) {
    url.pathname = '/login';
    url.searchParams.set('error', 'missing_token');
    return NextResponse.redirect(url);
  }

  try {
    const session = await exchangeToken(token);
    const response = NextResponse.redirect(new URL('/jobs', request.url));
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
    const nextUrl = new URL('/login', request.url);
    nextUrl.searchParams.set('error', (error as Error).message);
    return NextResponse.redirect(nextUrl);
  }
}
