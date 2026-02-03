import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Acceso · Listailor',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolved = (await searchParams) ?? {};
  const errorMessage = resolved.error;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 shadow-2xl shadow-slate-900/5">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            lista i t a i l o r
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Entra con link mágico</h1>
          <p className="text-sm text-slate-500">
            Te enviaremos un enlace seguro. No necesitas recordar contraseñas.
          </p>
        </div>
        <LoginForm />
        {errorMessage && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-600">
            {errorMessage}
          </p>
        )}
        <p className="text-center text-xs text-slate-400">
          ¿Problemas? Escríbenos a{' '}
          <Link href="mailto:team@listailor.com" className="font-semibold text-slate-700">
            team@listailor.com
          </Link>
        </p>
      </div>
    </main>
  );
}
