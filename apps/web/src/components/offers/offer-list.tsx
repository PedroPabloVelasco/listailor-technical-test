'use client';

import { useState } from 'react';
import type { CandidateOverviewRow } from '@/lib/api/types';
import { CANDIDATE_STAGES } from '@/lib/api/types';
import { CandidateDetailDialog } from '@/components/candidate-detail-dialog';
import { formatChileDateTime } from '@/lib/datetime';

export function OfferList({ offers }: { offers: CandidateOverviewRow[] }) {
  const [rows, setRows] = useState(offers);
  const [selected, setSelected] = useState<CandidateOverviewRow | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const hasOffers = rows.length > 0;

  async function updateStage(candidateId: number, stage: string) {
    setError(null);
    setLoadingId(candidateId);
    setRows((prev) => prev.map((c) => (c.id === candidateId ? { ...c, stage } : c)));
    try {
      const res = await fetch(`/api/candidates/${candidateId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la etapa');
    } finally {
      setLoadingId(null);
    }
  }

  if (!hasOffers) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-base font-semibold text-emerald-800">
          Aún no tienes candidatos en oferta.
        </p>
        <p className="mt-2 text-sm text-emerald-700">
          Vuelve después de correr el scoring o revisar la vista general.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {rows.map((candidate) => (
        <article
          key={candidate.id}
          className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition"
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Oferta abierta</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{candidate.candidateName}</h2>
              <p className="text-sm text-slate-500">{candidate.jobTitle}</p>
              {candidate.jobDescription ? (
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                  {candidate.jobDescription.replace(/<[^>]+>/g, '')}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Final score</p>
              <div className="text-2xl font-bold text-slate-900">
                {candidate.finalScore?.toFixed(2) ?? '—'}
              </div>
              <p className="text-[11px] text-slate-400">Última evaluación</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Etapa actual: {candidate.stage}
            </span>
            <span>Flags de riesgo: {candidate.riskFlags.length || 0}</span>
            {candidate.lastScoredAt ? (
              <span>
                Último score: {formatChileDateTime(candidate.lastScoredAt)}
              </span>
            ) : null}
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Mover a
              </label>
              <select
                value={candidate.stage}
                onChange={(event) => updateStage(candidate.id, event.target.value)}
                disabled={loadingId === candidate.id}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 focus:border-emerald-400 focus:outline-none"
              >
                {CANDIDATE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <button
              className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:border-emerald-200"
              onClick={() => {
                setSelected(candidate);
                setOpen(true);
              }}
            >
              Ver detalle completo
            </button>
            <a
              href={candidate.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Abrir CV
            </a>
          </div>
        </article>
      ))}

      <CandidateDetailDialog
        open={open}
        onOpenChange={setOpen}
        candidate={selected}
        onScored={(candidateId, finalScore) => {
          const stamp = new Date().toISOString();
          setRows((prev) =>
            prev.map((c) =>
              c.id === candidateId ? { ...c, finalScore, lastScoredAt: stamp } : c,
            ),
          );
        }}
      />
    </section>
  );
}
