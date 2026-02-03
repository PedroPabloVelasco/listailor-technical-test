'use client';

import { useMemo, useState } from 'react';
import type { CandidateOverviewRow } from '@/lib/api/types';
import { CandidateDetailDialog } from '@/components/candidate-detail-dialog';

const ALL_STAGES = ['INBOX', 'SHORTLIST', 'MAYBE', 'NO', 'INTERVIEW', 'OFFER'] as const;
type Stage = (typeof ALL_STAGES)[number];

const COLUMN_ORDER = ['INBOX', 'SHORTLIST', 'MAYBE', 'NO', 'INTERVIEW', 'OFFER'] as const;
type ColumnStage = (typeof COLUMN_ORDER)[number];

const stageTitles: Record<ColumnStage, { label: string; tone: string }> = {
  INBOX: { label: 'Inbox', tone: 'text-slate-700' },
  SHORTLIST: { label: 'Shortlist', tone: 'text-blue-700' },
  MAYBE: { label: 'Maybe', tone: 'text-purple-700' },
  NO: { label: 'No / Descartado', tone: 'text-rose-700' },
  INTERVIEW: { label: 'Interviews', tone: 'text-amber-700' },
  OFFER: { label: 'Offers', tone: 'text-emerald-700' },
};

export function PipelineBoard({ initial }: { initial: CandidateOverviewRow[] }) {
  const [rows, setRows] = useState(initial);
  const [selected, setSelected] = useState<CandidateOverviewRow | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fallbackColumn: ColumnStage = 'INTERVIEW';
  const groups = useMemo(() => {
    const map: Record<ColumnStage, CandidateOverviewRow[]> = {
      INBOX: [],
      SHORTLIST: [],
      MAYBE: [],
      NO: [],
      INTERVIEW: [],
      OFFER: [],
    };
    rows.forEach((row) => {
      const column = COLUMN_ORDER.includes(row.stage as ColumnStage)
        ? (row.stage as ColumnStage)
        : fallbackColumn;
      map[column].push(row);
    });
    return map;
  }, [rows]);


  async function updateStage(candidateId: number, stage: Stage) {
    setError(null);
    setLoading(candidateId);
    setRows((prev) => prev.map((c) => (c.id === candidateId ? { ...c, stage } : c)));
    try {
      const res = await fetch(`/api/candidates/${candidateId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la etapa');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="grid gap-4 md:grid-cols-5 min-w-[900px]">
          {COLUMN_ORDER.map((column) => (
            <section key={column} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between">
                <div className={`font-semibold ${stageTitles[column].tone}`}>
                  {stageTitles[column].label}
                </div>
                <span className="text-xs text-slate-500">{groups[column].length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {groups[column].map((candidate) => (
                  <article
                    key={candidate.id}
                    className="rounded-xl border border-white/80 bg-white p-3 text-sm shadow-sm transition hover:border-blue-200"
                  >
                    <button
                      className="text-left"
                      onClick={() => {
                        setSelected(candidate);
                        setOpen(true);
                      }}
                    >
                      <p className="font-semibold text-slate-900">{candidate.candidateName}</p>
                      <p className="text-xs text-slate-500">{candidate.jobTitle}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Score {candidate.finalScore?.toFixed(2) ?? '—'}
                      </p>
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ALL_STAGES.filter((s) => s !== candidate.stage).map((stage) => (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => updateStage(candidate.id, stage)}
                          disabled={loading === candidate.id}
                          className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:border-blue-200 disabled:opacity-50"
                        >
                          {stage}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
                {groups[column].length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                    Sin candidatos
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      <CandidateDetailDialog
        open={open}
        onOpenChange={setOpen}
        candidate={selected}
        onScored={(candidateId, finalScore) => {
          setRows((prev) =>
            prev.map((x) => (x.id === candidateId ? { ...x, finalScore } : x))
          );
        }}
      />
    </div>
  );
}
