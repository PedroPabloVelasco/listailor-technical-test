'use client';

import { useMemo, useState } from 'react';
import type { Candidate } from '@/lib/api/endpoints';
import { CandidateDetailDialog } from '@/components/candidate-detail-dialog';


type ScoreDimension = {
  score: number;
  reason?: string;
  flags?: string[];
};

type NormalizedScore = {
  candidateId: number;
  finalScore: number;
  relevance?: ScoreDimension;
  experience?: ScoreDimension;
  motivation?: ScoreDimension;
  risk?: ScoreDimension;
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
      riskFlags?: string[];
      createdAt: string;
    };

type SortMode = 'unscored_first' | 'score_desc' | 'score_asc' | 'name_asc';

const STAGES = ['INBOX', 'SHORTLIST', 'INTERVIEW', 'OFFER', 'REJECTED'] as const;
type Stage = (typeof STAGES)[number];

function isStage(x: string): x is Stage {
  return (STAGES as readonly string[]).includes(x);
}

function normalizeScore(data: RawScoreResponse): NormalizedScore {
  if ('relevance' in data) {
    return data;
  }

  return {
    candidateId: data.candidateId,
    finalScore: data.finalScore,
    relevance: { score: data.relevanceScore, reason: data.relevanceReason },
    experience: { score: data.experienceScore, reason: data.experienceReason },
    motivation: { score: data.motivationScore, reason: data.motivationReason },
    risk: { score: data.riskScore, flags: data.riskFlags ?? [] },
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
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [sort, setSort] = useState<SortMode>('unscored_first');
  const [bulkN, setBulkN] = useState<number>(10);

  const availableStages = useMemo(() => {
    const s = new Set(rows.map((r) => r.stage));
    return Array.from(s).sort();
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
    <div className="space-y-3">
      {/* Controls */}
      <div className="border rounded p-3 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search candidate…"
              className="border rounded px-3 py-2 text-sm w-full md:w-64"
            />

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="ALL">All stages</option>
              {availableStages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyUnscored}
                onChange={(e) => setOnlyUnscored(e.target.checked)}
              />
              Only unscored
            </label>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="unscored_first">Unscored first</option>
              <option value="score_desc">Score desc</option>
              <option value="score_asc">Score asc</option>
              <option value="name_asc">Name A→Z</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={50}
              value={bulkN}
              onChange={(e) => setBulkN(Number(e.target.value))}
              className="border rounded px-3 py-2 text-sm w-20"
            />
            <button
              onClick={() => void onBulkScore()}
              disabled={bulkLoading}
              className="border rounded px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              {bulkLoading ? 'Scoring…' : `Score top ${bulkN}`}
            </button>
          </div>
        </div>

        <div className="text-xs opacity-70">
          Showing {filtered.length} of {rows.length}
        </div>
      </div>

      {error ? (
        <div className="border rounded p-3 text-sm">
          <div className="font-medium">Error</div>
          <div className="opacity-80 break-words">{error}</div>
        </div>
      ) : null}

      {/* Table */}
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="p-3">Candidate</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Final score</th>
              <th className="p-3">CV</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b last:border-b-0">
                <td className="p-3">
                  <button
                    className="underline text-left"
                    onClick={() => {
                      setSelected(c);
                      setOpen(true);
                    }}
                  >
                    {c.candidateName}
                  </button>
                </td>

                <td className="p-3">
                  <select
                    value={isStage(c.stage) ? c.stage : 'INBOX'}
                    disabled={stageLoadingId === c.id || bulkLoading}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!isStage(next)) return;
                      void updateCandidateStage(c.id, next);
                    }}
                    className="border rounded px-2 py-1 text-sm bg-background disabled:opacity-50"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-3">
                  {c.finalScore === null ? '—' : c.finalScore.toFixed(2)}
                </td>

                <td className="p-3">
                  <a
                    href={c.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    View
                  </a>
                </td>

                <td className="p-3 text-right">
                  <button
                    onClick={() => void onScoreOne(c.id)}
                    disabled={loadingId === c.id || bulkLoading}
                    className="border rounded px-3 py-1 hover:bg-muted disabled:opacity-50"
                  >
                    {loadingId === c.id ? 'Scoring…' : 'Score'}
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td className="p-6 text-sm opacity-70" colSpan={5}>
                  No candidates match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Last score panel */}
      {lastScore && (
        <div className="border rounded p-3 text-sm space-y-2">
          <div className="font-medium">
            Last scored: #{lastScore.candidateId} → {lastScore.finalScore.toFixed(2)}
          </div>

          <div className="space-y-1">
            <div>
              <strong>Relevance:</strong>{' '}
              {lastScore.relevance?.score ?? '—'} —{' '}
              <span className="opacity-80">{lastScore.relevance?.reason ?? ''}</span>
            </div>
            <div>
              <strong>Experience:</strong>{' '}
              {lastScore.experience?.score ?? '—'} —{' '}
              <span className="opacity-80">{lastScore.experience?.reason ?? ''}</span>
            </div>
            <div>
              <strong>Motivation:</strong>{' '}
              {lastScore.motivation?.score ?? '—'} —{' '}
              <span className="opacity-80">{lastScore.motivation?.reason ?? ''}</span>
            </div>
            <div>
              <strong>Risk:</strong>{' '}
              {lastScore.risk?.score ?? '—'}{' '}
              {lastScore.risk?.flags?.length
                ? `(${lastScore.risk.flags.join(', ')})`
                : ''}
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
