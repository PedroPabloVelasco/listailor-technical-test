'use client';

import { useState, FormEvent } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [previewLink, setPreviewLink] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;
    setStatus('sending');
    setMessage('');
    setPreviewLink(null);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'No pudimos enviar el correo.');
      }
      setStatus('sent');
      setMessage('Revisa tu correo para abrir el enlace de acceso.');
      if (data?.previewLink) {
        setPreviewLink(data.previewLink as string);
      }
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-semibold text-slate-600">
        Correo de acceso
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="founder@startup.com"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-500"
      >
        {status === 'sending' ? 'Enviando…' : 'Recibir enlace mágico'}
      </button>
      {message && (
        <p className="text-sm text-slate-600">
          {message}
          {previewLink && (
            <>
              {' '}
              <a
                className="font-semibold text-slate-900 underline"
                href={previewLink}
              >
                Abrir enlace ahora
              </a>
            </>
          )}
        </p>
      )}
    </form>
  );
}
