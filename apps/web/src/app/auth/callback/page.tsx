import { Suspense } from 'react';
import { CallbackClient } from './callback-client';

function CallbackContent() {
  return <CallbackClient />;
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="w-full max-w-md space-y-8 px-4 py-12 text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Cargando...
            </h1>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
