'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const exchangeToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage('Token no proporcionado');
        setTimeout(() => router.push('/login?error=missing_token'), 2000);
        return;
      }

      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'No fue posible iniciar sesión');
        }

        setStatus('success');
        setTimeout(() => router.push('/jobs'), 500);
      } catch (error) {
        setStatus('error');
        setErrorMessage((error as Error).message);
        setTimeout(
          () =>
            router.push(
              `/login?error=${encodeURIComponent((error as Error).message)}`
            ),
          2000
        );
      }
    };

    exchangeToken();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 px-4 py-12 text-center">
        {status === 'loading' && (
          <>
            <div className="flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Verificando tu sesión...
            </h1>
            <p className="text-gray-600">
              Por favor espera mientras confirmamos tu inicio de sesión.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-red-600">
              Error al iniciar sesión
            </h1>
            <p className="text-gray-600">{errorMessage}</p>
            <p className="text-sm text-gray-500">
              Redirigiendo a la página de inicio de sesión...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-green-600">
              ¡Sesión confirmada!
            </h1>
            <p className="text-gray-600">Redirigiendo al dashboard...</p>
          </>
        )}
      </div>
    </div>
  );
}
