'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Candidate } from '@/lib/api/endpoints';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type AnswerItem = { question: string; value: string };

type ScoreBreakdown = {
  relevanceScore: number;
  relevanceReason: string;
  experienceScore: number;
  experienceReason: string;
  motivationScore: number;
  motivationReason: string;
  riskScore: number;
  riskFlags: unknown;
  createdAt: string;
};

type CandidateDetail = {
  id: number;
  candidateName: string;
  cvUrl: string;
  stage: string;
  rawAnswers: unknown;
  finalScore: number | null;
  scoreBreakdown: ScoreBreakdown | null;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function extractAnswers(rawAnswers: unknown): AnswerItem[] {
  // backend actual: { answers: [{question,value}, ...] }
  if (isRecord(rawAnswers) && Array.isArray(rawAnswers.answers)) {
    return rawAnswers.answers
      .map((x) => {
        if (!isRecord(x)) return null;
        const q = x.question;
        const v = x.value;
        return {
          question: typeof q === 'string' ? q : '',
          value: typeof v === 'string' ? v : '',
        };
      })
      .filter((x): x is AnswerItem => Boolean(x && (x.question || x.value)));
  }

  // fallback legacy: rawAnswers: [{question,value}, ...]
  if (Array.isArray(rawAnswers)) {
    return rawAnswers
      .map((x) => {
        if (!isRecord(x)) return null;
        const q = x.question;
        const v = x.value;
        return {
          question: typeof q === 'string' ? q : '',
          value: typeof v === 'string' ? v : '',
        };
      })
      .filter((x): x is AnswerItem => Boolean(x && (x.question || x.value)));
  }

  return [];
}

function formatLocal(dt: string): string {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return d.toLocaleString();
}

function isUrlLike(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

function clampText(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trim()}…`;
}

export function CandidateDetailDialog({
  open,
  onOpenChange,
  candidate,
  onScored,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidate: Candidate | null;
  onScored: (candidateId: number, finalScore: number) => void;
}) {
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // per-question expansion
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // reset when closing / switching candidate
    if (!open) {
      setDetail(null);
      setError(null);
      setExpanded({});
      return;
    }
    if (!candidate) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/candidates/${candidate!.id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load candidate (${res.status})`);
        const data = (await res.json()) as CandidateDetail;
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, candidate]);

  const answers = useMemo<AnswerItem[]>(() => extractAnswers(detail?.rawAnswers), [detail?.rawAnswers]);

  const headerTitle = candidate ? `${candidate.candidateName} (#${candidate.id})` : 'Candidate';

  const stageChip = detail?.stage ?? candidate?.stage ?? 'INBOX';
  const finalScore = detail?.finalScore ?? candidate?.finalScore ?? null;
  const riskScore = detail?.scoreBreakdown?.riskScore ?? null;

  async function score() {
    if (!candidate) return;
    setScoring(true);
    setError(null);

    try {
      const res = await fetch(`/api/candidates/${candidate.id}/score`, { method: 'POST' });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Scoring failed (${res.status})`);
      }

      const data = (await res.json()) as { finalScore: number };
      onScored(candidate.id, data.finalScore);

      // reload detail for breakdown
      const r2 = await fetch(`/api/candidates/${candidate.id}`, { cache: 'no-store' });
      if (r2.ok) setDetail((await r2.json()) as CandidateDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setScoring(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Max height + inner scroll */}
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <div className="flex flex-col max-h-[85vh]">
          {/* HEADER */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-lg md:text-xl">{headerTitle}</DialogTitle>

            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded border bg-muted/40">{stageChip}</span>
                <span className="px-2 py-1 rounded border">
                  Score: {finalScore === null ? '—' : finalScore.toFixed(2)}
                </span>
                <span className="px-2 py-1 rounded border">
                  Risk: {riskScore === null ? '—' : riskScore}
                </span>
                {detail?.scoreBreakdown?.createdAt ? (
                  <span className="text-xs opacity-70">
                    Last scored: {formatLocal(detail.scoreBreakdown.createdAt)}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {detail?.cvUrl ? (
                  <a
                    href={detail.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline"
                  >
                    Open CV
                  </a>
                ) : null}

                <Button onClick={() => void score()} disabled={scoring}>
                  {scoring ? 'Scoring…' : 'Score'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* BODY */}
          <div className="px-6 py-5 overflow-auto">
            {error ? (
              <div className="border rounded p-3 text-sm mb-4">
                <div className="font-medium">Error</div>
                <div className="opacity-80 break-words">{error}</div>
              </div>
            ) : null}

            {loading ? (
              <div className="text-sm opacity-70">Loading…</div>
            ) : detail ? (
              <div className="grid gap-4 md:grid-cols-5">
                {/* LEFT: Score breakdown */}
                <div className="md:col-span-2 border rounded p-4">
                  <div className="font-medium text-sm mb-3">Score breakdown</div>

                  {detail.scoreBreakdown ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">Relevance</div>
                          <div className="opacity-80">{detail.scoreBreakdown.relevanceReason}</div>
                        </div>
                        <div className="shrink-0 px-2 py-1 rounded border text-xs">
                          {detail.scoreBreakdown.relevanceScore}/5
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">Experience</div>
                          <div className="opacity-80">{detail.scoreBreakdown.experienceReason}</div>
                        </div>
                        <div className="shrink-0 px-2 py-1 rounded border text-xs">
                          {detail.scoreBreakdown.experienceScore}/5
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">Motivation</div>
                          <div className="opacity-80">{detail.scoreBreakdown.motivationReason}</div>
                        </div>
                        <div className="shrink-0 px-2 py-1 rounded border text-xs">
                          {detail.scoreBreakdown.motivationScore}/5
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">Risk</div>
                        <div className="shrink-0 px-2 py-1 rounded border text-xs">
                          {detail.scoreBreakdown.riskScore}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm opacity-70">No score yet.</div>
                  )}
                </div>

                {/* RIGHT: Answers */}
                <div className="md:col-span-3 border rounded p-4">
                  <div className="font-medium text-sm mb-3">Application answers</div>

                  {answers.length ? (
                    <div className="space-y-3">
                      {answers.map((a, idx) => {
                        const key = `${idx}-${a.question}`;
                        const isExpanded = Boolean(expanded[key]);
                        const text = a.value || '';
                        const showToggle = text.trim().length > 240;

                        return (
                          <div key={key} className="border rounded p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="font-medium text-sm">
                                {a.question || `Answer ${idx + 1}`}
                              </div>

                              {showToggle ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
                                  }
                                  className="text-xs underline opacity-80"
                                >
                                  {isExpanded ? 'Show less' : 'Show more'}
                                </button>
                              ) : null}
                            </div>

                            <div className="mt-2 text-sm opacity-90 whitespace-pre-wrap break-words">
                              {isUrlLike(text) ? (
                                <a
                                  href={text.trim()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  {text.trim()}
                                </a>
                              ) : (
                                <span>{isExpanded ? text : clampText(text, 240)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm opacity-70">No answers available.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm opacity-70">No data.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
