import { fetchCandidatesOverview } from '@/lib/api/endpoints';
import { PipelineBoard } from '@/components/overview/pipeline-board';
import { PageHeader } from '@/components/page-header';
import Link from 'next/link';

export default async function PipelinePage() {
  const rows = await fetchCandidatesOverview();
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Resumen global de candidatos"
          subtitle="Visualiza todos los candidatos por etapa y regresa a Roles para profundizar en cada oferta."
          backLink={{ href: '/jobs', label: '← Volver a roles' }}
          actions={
            <Link
              href="/offers"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Ver candidatos con oferta
            </Link>
          }
        />
        <PipelineBoard initial={rows} />
      </div>
    </main>
  );
}
