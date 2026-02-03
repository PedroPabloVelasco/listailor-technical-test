'use client';

import { useMemo, useState } from 'react';
import type { Candidate } from '@/lib/api/endpoints';
import { CandidateDetailDialog } from '@/components/candidate-detail-dialog';


type ScoreDimension = {
  score: number;
  reason: string;
};

type NormalizedScore = {
  candidateId: number;
  finalScore: number;
  relevance: ScoreDimension;
  experience: ScoreDimension;
  motivation: ScoreDimension;
  risk: ScoreDimension;
  riskFlags: string[];
  createdAt?: string;
};

type RawScoreResponse =
  | {
      candidateId: number;
      finalScore: number;
      relevance: ScoreDimension;
      experience: ScoreDimension;
      motivation: ScoreDimension;
      risk: ScoreDimension;
      riskFlags?: string[];
      createdAt: string;
    }
  | {
      candidateId: number;
      finalScore: number;
      relevanceScore: number;
      relevanceReason: string;
      experienceScore: number;
      experienceReason: string;
      motivationScore: number;
      motivationReason: string;
      riskScore: number;
      riskReason?: string;
      riskFlags?: string[];
      createdAt: string;
    };

type SortMode = 'unscored_first' | 'score_desc' | 'score_asc' | 'name_asc';

const STAGES = ['INBOX', 'SHORTLIST', 'INTERVIEW', 'OFFER', 'REJECTED'] as const;
type Stage = (typeof STAGES)[number];
type StageFilter = 'ALL' | Stage;

const stageColors: Record<Stage, string> = {
  INBOX: 'bg-slate-400',
  SHORTLIST: 'bg-blue-500',
  INTERVIEW: 'bg-amber-500',
  OFFER: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
};

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'unscored_first', label: 'Pendientes primero' },
  { value: 'score_desc', label: 'Mayor puntaje' },
  { value: 'score_asc', label: 'Menor puntaje' },
  { value: 'name_asc', label: 'Nombre A→Z' },
];

function isStage(x: string): x is Stage {
  return (STAGES as readonly string[]).includes(x);
}

function normalizeScore(data: RawScoreResponse): NormalizedScore {
  if ('relevance' in data) {
    return {
      candidateId: data.candidateId,
      finalScore: data.finalScore,
      relevance: data.relevance,
      experience: data.experience,
      motivation: data.motivation,
      risk: data.risk,
      riskFlags: data.riskFlags ?? [],
      createdAt: data.createdAt,
    };
  }

  return {
    candidateId: data.candidateId,
    finalScore: data.finalScore,
    relevance: { score: data.relevanceScore, reason: data.relevanceReason },
    experience: { score: data.experienceScore, reason: data.experienceReason },
    motivation: { score: data.motivationScore, reason: data.motivationReason },
    risk: { score: data.riskScore, reason: data.riskReason ?? '' },
    riskFlags: data.riskFlags ?? [],
    createdAt: data.createdAt,
  };
}

export function CandidatesTable({ initial }: { initial: Candidate[] }) {
  const [rows, setRows] = useState<Candidate[]>(initial);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);

  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [stageLoadingId, setStageLoadingId] = useState<number | null>(null);

  const [lastScore, setLastScore] = useState<NormalizedScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [onlyUnscored, setOnlyUnscored] = useState(false);
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  const [sort, setSort] = useState<SortMode>('unscored_first');
  const [bulkN, setBulkN] = useState<number>(10);

  const summary = useMemo(() => {
    const total = rows.length;
    const scored = rows.filter((c) => c.finalScore !== null);
    const unscored = total - scored.length;
    const avgScore = scored.length
      ? scored.reduce((acc, c) => acc + (c.finalScore ?? 0), 0) / scored.length
      : null;
    return { total, scored: scored.length, unscored, avgScore };
  }, [rows]);

  const stageDistribution = useMemo(() => {
    const counts: Record<Stage, number> = {
      INBOX: 0,
      SHORTLIST: 0,
      INTERVIEW: 0,
      OFFER: 0,
      REJECTED: 0,
    };
    rows.forEach((c) => {
      if (isStage(c.stage)) counts[c.stage] += 1;
    });
    return counts;
  }, [rows]);


  const filtered = useMemo(() => {
    let list = rows;
    const q = query.trim().toLowerCase();

    if (q) list = list.filter((c) => c.candidateName.toLowerCase().includes(q));
    if (stageFilter !== 'ALL') list = list.filter((c) => c.stage === stageFilter);
    if (onlyUnscored) list = list.filter((c) => c.finalScore === null);

    const byName = (a: Candidate, b: Candidate) =>
      a.candidateName.localeCompare(b.candidateName);

    const byScoreDesc = (a: Candidate, b: Candidate) =>
      (b.finalScore ?? -Infinity) - (a.finalScore ?? -Infinity);

    const byScoreAsc = (a: Candidate, b: Candidate) =>
      (a.finalScore ?? Infinity) - (b.finalScore ?? Infinity);

    const unscoredFirst = (a: Candidate, b: Candidate) => {
      const au = a.finalScore === null ? 0 : 1;
      const bu = b.finalScore === null ? 0 : 1;
      if (au !== bu) return au - bu;
      return byScoreDesc(a, b) || byName(a, b);
    };

    if (sort === 'name_asc') return [...list].sort(byName);
    if (sort === 'score_desc') return [...list].sort(byScoreDesc);
    if (sort === 'score_asc') return [...list].sort(byScoreAsc);
    return [...list].sort(unscoredFirst);
  }, [rows, query, stageFilter, onlyUnscored, sort]);


  async function scoreCandidate(candidateId: number): Promise<NormalizedScore> {
    const res = await fetch(`/api/candidates/${candidateId}/score`, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
    const raw = (await res.json()) as RawScoreResponse;
    return normalizeScore(raw);
  }

  async function onScoreOne(candidateId: number) {
    setError(null);
    setLoadingId(candidateId);

    try {
      const data = await scoreCandidate(candidateId);
      setRows((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, finalScore: data.finalScore } : c)),
      );
      setLastScore(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoadingId(null);
    }
  }

  async function onBulkScore() {
    setError(null);
    setBulkLoading(true);

    try {
      const targets = filtered
        .filter((c) => c.finalScore === null)
        .slice(0, Math.min(50, Math.max(1, bulkN)));

      for (const c of targets) {
        const data = await scoreCandidate(c.id);
        setRows((prev) =>
          prev.map((x) => (x.id === c.id ? { ...x, finalScore: data.finalScore } : x)),
        );
        setLastScore(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBulkLoading(false);
    }
  }

  async function updateCandidateStage(candidateId: number, nextStage: Stage) {
    setStageLoadingId(candidateId);

    const prevStage = rows.find((r) => r.id === candidateId)?.stage;

    setRows((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, stage: nextStage } : c)),
    );

    try {
      const res = await fetch(`/api/candidates/${candidateId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage }),
      });

      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      if (prevStage) {
        setRows((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, stage: prevStage } : c)),
        );
      }
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setStageLoadingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Candidatos en proceso</h2>
            <p className="text-sm text-slate-500">
              {summary.total} personas · {summary.unscored} pendientes de score ·
              {summary.avgScore ? ` Score promedio ${summary.avgScore.toFixed(2)}` : ' Aún sin scores suficientes'}
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <span className="mr-2 text-xs uppercase tracking-wide text-slate-400">Top</span>
              <input
                type="number"
                min={1}
                max={50}
                value={bulkN}
                onChange={(e) => setBulkN(Number(e.target.value))}
                className="w-14 border-none bg-transparent text-right text-slate-900 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void onBulkScore()}
              disabled={bulkLoading}
              className="rounded-2xl border border-blue-200 bg-blue-600/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60"
            >
              {bulkLoading ? 'Calificando…' : `Score automático`}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Búsqueda
              </label>
              <div className="mt-2 relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="9" r="6" />
                    <path d="m15 15 4 4" />
                  </svg>
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o palabra clave"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Etapas activas
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['ALL', ...STAGES] as StageFilter[]).map((stage) => {
                  const active = stageFilter === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setStageFilter(stage)}
                      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white shadow'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {stage === 'ALL' ? `Todas (${rows.length})` : `${stage}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setOnlyUnscored((v) => !v)}
                className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                  onlyUnscored
                    ? 'border-amber-300 bg-amber-50 text-amber-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200'
                }`}
              >
                {onlyUnscored ? 'Mostrando solo pendientes' : 'Filtrar pendientes' }
              </button>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-500">
              Distribución por etapa:{' '}
              {STAGES.map((stage) => (
                <span key={stage} className="mr-2 inline-flex items-center gap-1">
                  <span className={`inline-flex h-2 w-2 rounded-full ${stageColors[stage]}`} />
                  {stage}:{' '}
                  <span className="font-semibold text-slate-700">{stageDistribution[stage]}</span>
                </span>
              ))}
            </div>

            <div className="text-xs text-slate-500">
              Mostrando {filtered.length} de {rows.length} candidatos
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
          <div className="font-semibold">Hubo un problema</div>
          <div className="mt-1 break-words text-rose-800">{error}</div>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Candidato</th>
              <th className="px-4 py-3 font-medium">Etapa</th>
              <th className="px-4 py-3 font-medium">Score final</th>
              <th className="px-4 py-3 font-medium">CV</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c, idx) => (
              <tr
                key={c.id}
                className={idx % 2 === 0 ? 'border-t border-slate-100 bg-white' : 'border-t border-slate-100 bg-slate-50/40'}
              >
                <td className="px-4 py-3">
                  <button
                    className="text-left text-slate-900 transition hover:text-blue-600"
                    onClick={() => {
                      setSelected(c);
                      setOpen(true);
                    }}
                  >
                    <div className="font-semibold">{c.candidateName}</div>
                    <div className="text-xs text-slate-500">ID #{c.id}</div>
                  </button>
                </td>

                <td className="px-4 py-3">
                  <select
                    value={isStage(c.stage) ? c.stage : 'INBOX'}
                    disabled={stageLoadingId === c.id || bulkLoading}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!isStage(next)) return;
                      void updateCandidateStage(c.id, next);
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="px-4 py-3">
                  {c.finalScore === null ? (
                    <span className="text-xs uppercase tracking-wide text-slate-400">Pendiente</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {c.finalScore.toFixed(2)}
                    </span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <a
                    href={c.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
                  >
                    Ver CV
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" x2="21" y1="14" y2="3" />
                    </svg>
                  </a>
                </td>

                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void onScoreOne(c.id)}
                    disabled={loadingId === c.id || bulkLoading}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:opacity-50"
                  >
                    {loadingId === c.id ? 'Calificando…' : 'Score' }
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={5}>
                  No hay candidatos que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Last score panel */}
      {lastScore && (
        <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 text-sm text-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-base font-semibold text-slate-900">
              Último score: #{lastScore.candidateId}
            </div>
            <div className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-blue-800">
              {lastScore.finalScore.toFixed(2)} puntos
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div>
                <strong>Relevancia:</strong> {lastScore.relevance.score}
                <p className="text-xs text-slate-500">{lastScore.relevance.reason}</p>
              </div>
              <div>
                <strong>Experiencia:</strong> {lastScore.experience.score}
                <p className="text-xs text-slate-500">{lastScore.experience.reason}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <strong>Motivación:</strong> {lastScore.motivation.score}
                <p className="text-xs text-slate-500">{lastScore.motivation.reason}</p>
              </div>
              <div>
                <strong>Riesgo:</strong> {lastScore.risk.score} —{' '}
                <span className="text-xs text-slate-500">{lastScore.risk.reason}</span>{' '}
                {lastScore.riskFlags.length
                  ? `(${lastScore.riskFlags.join(', ')})`
                  : '(no flags)'}
              </div>
            </div>
          </div>
        </div>
      )}

      <CandidateDetailDialog
        open={open}
        onOpenChange={setOpen}
        candidate={selected}
        onScored={(candidateId, finalScore) => {
          setRows((prev) =>
            prev.map((x) => (x.id === candidateId ? { ...x, finalScore } : x)),
          );
        }}
      />
    </div>
  );
}
