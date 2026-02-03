'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Candidate, RubricConfig } from '@/lib/api/types';
import { CandidateDetailDialog } from '@/components/candidate-detail-dialog';
import { CHILE_TIME_LABEL, formatChileDateTime } from '@/lib/datetime';


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

type SortMode = 'unscored_first' | 'score_desc' | 'score_asc' | 'name_asc' | 'priority_desc';

const STAGES = ['INBOX', 'SHORTLIST', 'MAYBE', 'NO', 'INTERVIEW', 'OFFER'] as const;
type Stage = (typeof STAGES)[number];
type StageFilter = 'ALL' | Stage;

const stageColors: Record<Stage, string> = STAGES.reduce(
  (acc, stage) => {
    acc[stage] =
      stage === 'INBOX'
        ? 'bg-slate-400'
        : stage === 'SHORTLIST'
          ? 'bg-blue-500'
          : stage === 'MAYBE'
            ? 'bg-purple-500'
            : stage === 'NO'
              ? 'bg-rose-500'
              : stage === 'INTERVIEW'
                ? 'bg-amber-500'
                : 'bg-emerald-500';
    return acc;
  },
  {} as Record<Stage, string>,
);

type WeightKey = keyof RubricConfig['weights'];

const weightMeta: Record<
  WeightKey,
  { label: string; helper: string; tone: string }
> = {
  relevance: {
    label: 'Relevancia',
    helper: '¿Qué tan alineado está con el rol/equipo?',
    tone: 'text-emerald-700',
  },
  experience: {
    label: 'Experiencia',
    helper: 'Alcance y evidencia de impacto previo.',
    tone: 'text-blue-700',
  },
  motivation: {
    label: 'Motivación',
    helper: 'Claridad del interés y contexto aportado.',
    tone: 'text-amber-700',
  },
  riskPenalty: {
    label: 'Penalización de riesgo',
    helper: 'Se resta cuando existen banderas o dudas.',
    tone: 'text-rose-700',
  },
};

const SCORE_TIP_STORAGE_KEY = 'listailor:score-tip-dismissed-v1';

function formatRelativeTimestamp(ts: string | null): string {
  if (!ts) return 'Sin score';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'Hace instantes';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;
  return formatChileDateTime(date);
}

function useRelativeTime(ts: string | null): string {
  const [value, setValue] = useState('—');

  useEffect(() => {
    setValue(formatRelativeTimestamp(ts));
  }, [ts]);

  return value;
}

function RelativeTime({ ts }: { ts: string | null }) {
  const value = useRelativeTime(ts);
  const absolute = ts ? formatChileDateTime(ts) : null;
  return (
    <span title={absolute ? `${absolute} · ${CHILE_TIME_LABEL}` : undefined}>
      {value}
    </span>
  );
}

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'unscored_first', label: 'Pendientes primero' },
  { value: 'score_desc', label: 'Mayor puntaje' },
  { value: 'priority_desc', label: 'Prioridad (pesos IA)' },
  { value: 'score_asc', label: 'Menor puntaje' },
  { value: 'name_asc', label: 'Nombre A→Z' },
];

function isStage(x: string): x is Stage {
  return (STAGES as readonly string[]).includes(x);
}

function applyScoreToCandidate(candidate: Candidate, score: NormalizedScore): Candidate {
  const updatedAt = score.createdAt ?? new Date().toISOString();

  return {
    ...candidate,
    finalScore: score.finalScore,
    relevanceScore: score.relevance.score,
    experienceScore: score.experience.score,
    motivationScore: score.motivation.score,
    riskScore: score.risk.score,
    riskFlags: score.riskFlags ?? candidate.riskFlags,
    lastScoredAt: updatedAt,
  };
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

export function CandidatesTable({
  initial,
  rubric,
}: {
  initial: Candidate[];
  rubric: RubricConfig;
}) {
  const [rows, setRows] = useState<Candidate[]>(initial);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);

  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [scoreAllLoading, setScoreAllLoading] = useState(false);
  const [stageLoadingId, setStageLoadingId] = useState<number | null>(null);

  const [lastScore, setLastScore] = useState<NormalizedScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [onlyUnscored, setOnlyUnscored] = useState(false);
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  const [riskFilter, setRiskFilter] = useState<'all' | 'flagged' | 'clear'>('all');
  const [sort, setSort] = useState<SortMode>('unscored_first');
  const [bulkN, setBulkN] = useState<number>(10);
  const [weights, setWeights] = useState(() => ({ ...rubric.weights }));
  const [editingScoreId, setEditingScoreId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [savingScoreId, setSavingScoreId] = useState<number | null>(null);
  const [showScoreTip, setShowScoreTip] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(SCORE_TIP_STORAGE_KEY);
    if (!dismissed) setShowScoreTip(true);
  }, []);

  const dismissScoreTip = () => {
    setShowScoreTip(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SCORE_TIP_STORAGE_KEY, 'true');
    }
  };

  const positiveWeightTotal =
    weights.relevance + weights.experience + weights.motivation || 1;

  const weightPercentages = {
    relevance: Math.round((weights.relevance / positiveWeightTotal) * 100),
    experience: Math.round((weights.experience / positiveWeightTotal) * 100),
    motivation: Math.round((weights.motivation / positiveWeightTotal) * 100),
  };

  const latestAudit = useMemo(() => {
    const timestamps = rows
      .map((c) => (c.lastScoredAt ? new Date(c.lastScoredAt).getTime() : null))
      .filter((n): n is number => typeof n === 'number');
    if (!timestamps.length) return null;
    return new Date(Math.max(...timestamps)).toISOString();
  }, [rows]);

  const computePriorityScore = useCallback((candidate: Candidate): number | null => {
    if (
      candidate.relevanceScore === null ||
      candidate.experienceScore === null ||
      candidate.motivationScore === null ||
      candidate.riskScore === null
    ) {
      return candidate.finalScore;
    }
    const raw =
      weights.relevance * candidate.relevanceScore +
      weights.experience * candidate.experienceScore +
      weights.motivation * candidate.motivationScore -
      weights.riskPenalty * candidate.riskScore;

    const clamped = Math.max(0, Math.min(5, raw));
    return Math.round(clamped * 100) / 100;
  }, [weights]);

  const priorityScores = useMemo(() => {
    const map = new Map<number, number>();
    rows.forEach((candidate) => {
      const score = computePriorityScore(candidate);
      if (typeof score === 'number' && Number.isFinite(score)) {
        map.set(candidate.id, score);
      }
    });
    return map;
  }, [rows, computePriorityScore]);

  function beginManualScore(candidate: Candidate) {
    if (candidate.finalScore === null) return;
    setError(null);
    setEditingScoreId(candidate.id);
    setEditingValue(candidate.finalScore.toFixed(2));
  }

function cancelManualScore() {
  setEditingScoreId(null);
  setEditingValue('');
}

  async function persistFinalScore(candidateId: number, value: number) {
    const res = await fetch(`/api/candidates/${candidateId}/final-score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalScore: value }),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as { candidateId: number; finalScore: number };
  }

  function handleWeightChange(key: WeightKey, value: number) {
    setWeights((prev) => ({
      ...prev,
      [key]: Number.isNaN(value) ? prev[key] : value,
    }));
  }

  const summary = useMemo(() => {
    const total = rows.length;
    const scored = rows.filter((c) => c.finalScore !== null);
    const unscored = total - scored.length;
    const avgScore = scored.length
      ? scored.reduce((acc, c) => acc + (c.finalScore ?? 0), 0) / scored.length
      : null;
    return { total, scored: scored.length, unscored, avgScore };
  }, [rows]);

  const scoringInFlight = bulkLoading || scoreAllLoading;

  const stageDistribution = useMemo(() => {
    const counts = STAGES.reduce(
      (acc, stage) => ({ ...acc, [stage]: 0 }),
      {} as Record<Stage, number>,
    );
    rows.forEach((c) => {
      if (isStage(c.stage)) counts[c.stage] += 1;
    });
    return counts;
  }, [rows]);

  const leaderboard = useMemo(() => {
    const scored = rows.filter((c) => c.finalScore !== null);
    return scored
      .map((c) => ({
        ...c,
        priority: priorityScores.get(c.id) ?? c.finalScore ?? 0,
      }))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .slice(0, 5);
  }, [rows, priorityScores]);


  const filtered = useMemo(() => {
    let list = rows;
    const q = query.trim().toLowerCase();

    if (q) list = list.filter((c) => c.candidateName.toLowerCase().includes(q));
    if (stageFilter !== 'ALL') list = list.filter((c) => c.stage === stageFilter);
    if (onlyUnscored) {
      list = list.filter((c) => c.finalScore === null);
    } else {
      list = list.filter((c) => {
        if (c.finalScore === null) return true;
        return (
          c.finalScore >= 0 && c.finalScore <= 5
        );
      });
    }

    if (riskFilter === 'flagged') {
      list = list.filter((c) => c.riskFlags.length > 0);
    } else if (riskFilter === 'clear') {
      list = list.filter((c) => c.riskFlags.length === 0);
    }

    const byName = (a: Candidate, b: Candidate) =>
      a.candidateName.localeCompare(b.candidateName);

    const byScoreDesc = (a: Candidate, b: Candidate) =>
      (b.finalScore ?? -Infinity) - (a.finalScore ?? -Infinity);

    const byScoreAsc = (a: Candidate, b: Candidate) =>
      (a.finalScore ?? Infinity) - (b.finalScore ?? Infinity);

    const byPriorityDesc = (a: Candidate, b: Candidate) =>
      (priorityScores.get(b.id) ?? -Infinity) -
      (priorityScores.get(a.id) ?? -Infinity);

    const unscoredFirst = (a: Candidate, b: Candidate) => {
      const au = a.finalScore === null ? 0 : 1;
      const bu = b.finalScore === null ? 0 : 1;
      if (au !== bu) return au - bu;
      return byScoreDesc(a, b) || byName(a, b);
    };

    if (sort === 'name_asc') return [...list].sort(byName);
    if (sort === 'score_desc') return [...list].sort(byScoreDesc);
    if (sort === 'score_asc') return [...list].sort(byScoreAsc);
    if (sort === 'priority_desc') return [...list].sort(byPriorityDesc);
    return [...list].sort(unscoredFirst);
  }, [
    rows,
    query,
    stageFilter,
    onlyUnscored,
    sort,
    riskFilter,
    priorityScores,
  ]);

  const renderScoreContent = (candidate: Candidate, variant: 'table' | 'card' = 'table') => {
    const numberInputClass = `${
      variant === 'card' ? 'w-full py-2' : 'w-20 py-1'
    } rounded-full border border-slate-200 px-3 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none`;

    return (
      <div className="flex flex-col gap-2">
        {candidate.finalScore === null ? (
          <span className="text-xs uppercase tracking-wide text-slate-400">Pendiente</span>
        ) : editingScoreId === candidate.id ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                className={numberInputClass}
              />
              <button
                type="button"
                onClick={() => void onSaveManualScore(candidate.id)}
                disabled={savingScoreId === candidate.id}
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
              >
                {savingScoreId === candidate.id ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={cancelManualScore}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-400"
              >
                Cancelar
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Último cálculo IA: <RelativeTime ts={candidate.lastScoredAt} />
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {candidate.finalScore.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => beginManualScore(candidate)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                Editar
              </button>
            </div>
            <span className="text-[11px] text-slate-500">
              <RelativeTime ts={candidate.lastScoredAt} />
            </span>
            {priorityScores.has(candidate.id) ? (
              <span className="text-[11px] text-slate-400">
                Prioridad personalizada:{' '}
                <span className="font-semibold text-slate-600">
                  {priorityScores.get(candidate.id)?.toFixed(2)}
                </span>
              </span>
            ) : null}
          </div>
        )}
        {candidate.riskFlags.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {candidate.riskFlags.slice(0, 3).map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
              >
                {flag}
              </span>
            ))}
            {candidate.riskFlags.length > 3 ? (
              <span className="text-[10px] text-rose-500">
                +{candidate.riskFlags.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };


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
        prev.map((c) => (c.id === candidateId ? applyScoreToCandidate(c, data) : c)),
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
          prev.map((x) => (x.id === c.id ? applyScoreToCandidate(x, data) : x)),
        );
        setLastScore(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBulkLoading(false);
    }
  }

  async function onScoreAll() {
    if (!rows.some((c) => c.finalScore === null)) {
      setError('Todos los candidatos ya tienen score.');
      return;
    }

    setError(null);
    setScoreAllLoading(true);

    try {
      for (const candidate of rows) {
        if (candidate.finalScore !== null) continue;
        const data = await scoreCandidate(candidate.id);
        setRows((prev) =>
          prev.map((row) =>
            row.id === candidate.id ? applyScoreToCandidate(row, data) : row,
          ),
        );
        setLastScore(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setScoreAllLoading(false);
    }
  }

  async function onSaveManualScore(candidateId: number) {
    const parsed = Number(editingValue);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
      setError('El score manual debe estar entre 1 y 5');
      return;
    }
    setError(null);
    setSavingScoreId(candidateId);
    try {
      const payload = await persistFinalScore(candidateId, Number(parsed.toFixed(2)));
      const nowIso = new Date().toISOString();
      setRows((prev) =>
        prev.map((c) =>
          c.id === candidateId
            ? { ...c, finalScore: payload.finalScore, lastScoredAt: nowIso }
            : c,
        ),
      );
      setLastScore((prev) =>
        prev && prev.candidateId === candidateId
          ? { ...prev, finalScore: payload.finalScore, createdAt: nowIso }
          : prev,
      );
      cancelManualScore();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el score');
    } finally {
      setSavingScoreId(null);
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
            <button
              type="button"
              onClick={() => void onScoreAll()}
              disabled={scoreAllLoading || bulkLoading || summary.unscored === 0}
              className="rounded-2xl border border-emerald-200 bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {scoreAllLoading ? 'Calificando todo…' : `Score a todos los pendientes (${summary.unscored})`}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Riesgo
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'clear', label: 'Sin flags' },
                    { value: 'flagged', label: 'Con flags' },
                  ].map((option) => {
                    const active = riskFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRiskFilter(option.value as typeof riskFilter)}
                        className={`rounded-full border px-4 py-1 text-xs font-medium transition ${
                          active
                            ? 'border-rose-400 bg-rose-50 text-rose-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
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

            <div className="rounded-2xl border border-slate-100 bg-white/70 p-4 text-xs text-slate-500">
              Registro más reciente:{' '}
              <span className="font-semibold text-slate-800">
                {latestAudit ? <RelativeTime ts={latestAudit} /> : 'sin datos'}
              </span>{' '}
              · Rubrica {rubric.version}
            </div>

            <div className="text-xs text-slate-500">
              Mostrando {filtered.length} de {rows.length} candidatos
            </div>
            <div className="text-[11px] text-slate-400">
              Referencia de hora: {CHILE_TIME_LABEL}
            </div>
          </div>
        </div>
      </div>

      {/* Scoring curation */}
      <div className="rounded-3xl border border-white/70 bg-slate-900/90 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-white/50">Política de scoring</p>
            <p className="text-sm text-white/70">{rubric.notes}</p>
          </div>
          <button
            type="button"
            onClick={() => setWeights({ ...rubric.weights })}
            className="self-start rounded-full border border-white/30 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Restablecer pesos
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(weightMeta) as WeightKey[]).map((key) => (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className={`text-sm font-semibold ${weightMeta[key].tone}`}>
                {weightMeta[key].label}
              </div>
              <p className="text-xs text-white/60">{weightMeta[key].helper}</p>
              <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
                Peso
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-white">
                  {(weights[key] * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={key === 'riskPenalty' ? 0.3 : 0.6}
                step={0.05}
                value={weights[key]}
                onChange={(e) => handleWeightChange(key, Number(e.target.value))}
                className="mt-2 w-full accent-white"
              />
              {key !== 'riskPenalty' ? (
                <p className="mt-2 text-xs text-white/60">
                  {weightPercentages[key as keyof typeof weightPercentages]}% del peso positivo
                </p>
              ) : (
                <p className="mt-2 text-xs text-white/60">
                  Se resta hasta {(weights.riskPenalty * 5).toFixed(1)} pts en presencia de banderas.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
          <div className="font-semibold">Hubo un problema</div>
          <div className="mt-1 break-words text-rose-800">{error}</div>
        </div>
      ) : null}

      {showScoreTip ? (
        <div className="rounded-3xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-900 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">Tip rápido</p>
              <p className="text-sm text-blue-900/80">
                Haz click en el nombre del candidato para revisar todos los datos y usa “Recalcular score” para refrescar la evaluación con IA.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissScoreTip}
              className="self-start rounded-full border border-blue-200 bg-white/60 px-4 py-1.5 text-xs font-semibold text-blue-900 transition hover:border-blue-400"
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}

      {/* Table */}
      <div className="rounded-3xl border border-white/70 bg-white">
        <div className="hidden overflow-hidden rounded-3xl md:block">
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
                  className={
                    idx % 2 === 0
                      ? 'border-t border-slate-100 bg-white'
                      : 'border-t border-slate-100 bg-slate-50/40'
                  }
                >
                  <td className="px-4 py-3">
                    <button
                      className="w-full text-left text-slate-900 transition hover:text-blue-600"
                      onClick={() => {
                        setSelected(c);
                        setOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold">
                            {c.candidateName}
                            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300" />
                          </div>
                          <div className="text-xs text-slate-500">ID #{c.id}</div>
                        </div>
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                          title="Abre la ficha para revisar detalles y recalcular el score"
                        >
                          Ver ficha
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={isStage(c.stage) ? c.stage : 'INBOX'}
                      disabled={stageLoadingId === c.id || scoringInFlight}
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

                  <td className="px-4 py-3 align-top">{renderScoreContent(c)}</td>

                  <td className="px-4 py-3">
                    <a
                      href={c.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                      Ver CV
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
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
                      disabled={loadingId === c.id || scoringInFlight}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:opacity-50"
                    >
                      {loadingId === c.id ? 'Calificando…' : 'Score'}
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

        <div className="block space-y-3 p-4 md:hidden">
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No hay candidatos que coincidan con los filtros seleccionados.
            </p>
          ) : (
            filtered.map((c) => (
              <article
                key={c.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
                      {c.candidateName}
                      <ArrowUpRight className="h-4 w-4 text-slate-300" />
                    </p>
                    <p className="text-xs text-slate-500">ID #{c.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(c);
                      setOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                    title="Abre la ficha completa para recalcular el score con IA"
                  >
                    Ver ficha
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Etapa</p>
                    <select
                      value={isStage(c.stage) ? c.stage : 'INBOX'}
                      disabled={stageLoadingId === c.id || scoringInFlight}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!isStage(next)) return;
                        void updateCandidateStage(c.id, next);
                      }}
                      className="mt-1 w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                      Score final
                    </p>
                    <div className="mt-2">{renderScoreContent(c, 'card')}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={c.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-center font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Ver CV
                  </a>
                  <button
                    type="button"
                    onClick={() => void onScoreOne(c.id)}
                    disabled={loadingId === c.id || scoringInFlight}
                    className="flex-1 rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-50"
                  >
                    {loadingId === c.id ? 'Calificando…' : 'Score automático'}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Ranking recomendado</p>
              <h3 className="text-lg font-semibold text-slate-900">Top {leaderboard.length} candidatos</h3>
            </div>
            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs text-slate-600">
              Pesos actuales
            </span>
          </div>
          <ol className="mt-4 space-y-3">
            {leaderboard.map((c, idx) => (
              <li key={c.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">#{idx + 1}</p>
                    <p className="text-sm font-semibold text-slate-900">{c.candidateName}</p>
                    <p className="text-xs text-slate-500">
                      {isStage(c.stage) ? c.stage : 'INBOX'} · Score {c.finalScore?.toFixed(2) ?? '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Prioridad</p>
                    <p className="text-base font-semibold text-slate-900">
                      {(priorityScores.get(c.id) ?? c.finalScore ?? 0).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      <RelativeTime ts={c.lastScoredAt} />
                    </p>
                 </div>
               </div>
             </li>
           ))}
            {leaderboard.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                Aún no hay scores registrados. Ejecuta el scoring automático para poblar este ranking.
              </li>
            ) : null}
          </ol>
        </div>

        <RiskOverview rows={rows} />
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
              <div className="text-xs text-slate-500">
                Actualizado: <RelativeTime ts={lastScore.createdAt ?? null} />
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

function RiskOverview({ rows }: { rows: Candidate[] }) {
  const flagged = rows
    .filter((c) => c.riskFlags.length > 0)
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 5);

  const pending = rows.filter((c) => c.finalScore === null).length;

  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Auditoría</p>
          <h3 className="text-lg font-semibold text-slate-900">Riesgos detectados</h3>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
          {flagged.length} con flags
        </span>
      </div>

      {flagged.length ? (
        <div className="mt-4 space-y-3">
          {flagged.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3 text-sm text-rose-900"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{c.candidateName}</p>
                <span className="text-xs font-semibold text-rose-600">
                  Riesgo {c.riskScore?.toFixed(1) ?? '—'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {c.riskFlags.map((flag) => (
                  <span
                    key={flag}
                    className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-rose-600"
                  >
                    {flag}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-rose-700">
                Último score: <RelativeTime ts={c.lastScoredAt} />
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-slate-200 border-dashed p-4 text-sm text-slate-500">
          Aún no hay banderas. {pending ? `Quedan ${pending} pendientes de score.` : 'Continúa monitoreando.'}
        </p>
      )}
    </div>
  );
}
