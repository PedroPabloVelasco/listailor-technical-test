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
  riskReason: string;
  riskFlags: string[];
  createdAt: string;
};

type ScoreCardItem = {
  label: string;
  value: number;
  helper: string;
  flags?: string[];
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

const stageTone: Record<string, string> = {
  INBOX: 'bg-slate-100 text-slate-700',
  SHORTLIST: 'bg-blue-50 text-blue-700',
  INTERVIEW: 'bg-amber-50 text-amber-700',
  OFFER: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-rose-50 text-rose-700',
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function extractAnswers(rawAnswers: unknown): AnswerItem[] {
  const normalizeList = (list: unknown[]): AnswerItem[] =>
    list
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

  if (isRecord(rawAnswers) && Array.isArray(rawAnswers.answers)) {
    return normalizeList(rawAnswers.answers);
  }

  if (Array.isArray(rawAnswers)) {
    return normalizeList(rawAnswers);
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
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

  const answers = useMemo(() => extractAnswers(detail?.rawAnswers), [detail?.rawAnswers]);
  const headerTitle = candidate ? candidate.candidateName : 'Candidato';
  const stageChip = detail?.stage ?? candidate?.stage ?? 'INBOX';
  const finalScore = detail?.finalScore ?? candidate?.finalScore ?? null;
  const riskScore = detail?.scoreBreakdown?.riskScore ?? null;

  const scoreItems: ScoreCardItem[] | null = detail?.scoreBreakdown
    ? [
        {
          label: 'Relevancia',
          value: detail.scoreBreakdown.relevanceScore,
          helper: detail.scoreBreakdown.relevanceReason,
        },
        {
          label: 'Experiencia',
          value: detail.scoreBreakdown.experienceScore,
          helper: detail.scoreBreakdown.experienceReason,
        },
        {
          label: 'Motivación',
          value: detail.scoreBreakdown.motivationScore,
          helper: detail.scoreBreakdown.motivationReason,
        },
        {
          label: 'Riesgo',
          value: detail.scoreBreakdown.riskScore,
          helper: detail.scoreBreakdown.riskReason,
          flags: detail.scoreBreakdown.riskFlags ?? [],
        },
      ]
    : null;

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
      <DialogContent className="max-w-5xl overflow-hidden border border-white/70 bg-white/90 p-0 shadow-2xl">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 pb-5 pt-6 text-white">
            <div className="flex flex-col gap-2">
              <div>
                <DialogTitle className="text-2xl font-semibold text-white">
                  {headerTitle}
                </DialogTitle>
                {candidate ? (
                  <p className="text-sm text-white/70">ID #{candidate.id}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                <span className={`rounded-full px-3 py-1 ${stageTone[stageChip] ?? 'bg-slate-100 text-slate-700'}`}>
                  {stageChip}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Score: {finalScore === null ? '—' : finalScore.toFixed(2)}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Riesgo:{' '}
                  {riskScore === null
                    ? '—'
                    : `${riskScore} · ${
                        detail?.scoreBreakdown?.riskReason ?? 'Sin motivo'
                      }`}
                </span>
                {detail?.scoreBreakdown?.createdAt ? (
                  <span className="text-white/70">
                    Último score: {formatLocal(detail.scoreBreakdown.createdAt)}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {detail?.cvUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white hover:text-slate-900"
                  >
                    <a href={detail.cvUrl} target="_blank" rel="noopener noreferrer">
                      Abrir CV
                    </a>
                  </Button>
                ) : null}

                <Button
                  size="sm"
                  onClick={() => void score()}
                  disabled={scoring}
                  className="bg-white text-slate-900 hover:bg-slate-100"
                >
                  {scoring ? 'Calificando…' : 'Recalcular score'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-slate-50/60 px-6 py-6">
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
                <strong>Hubo un problema:</strong> <span className="font-normal">{error}</span>
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-500">
                Cargando información del candidato…
              </div>
            ) : detail ? (
              <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
                <div className="space-y-5">
                  <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-500">Score general</div>
                    <div className="mt-3 flex items-end gap-3">
                      <span className="text-4xl font-bold text-slate-900">
                        {finalScore === null ? '—' : finalScore.toFixed(2)}
                      </span>
                      <span className="text-sm text-slate-500">/ 100</span>
                    </div>
                    {scoreItems ? (
                      <div className="mt-4 space-y-3">
                        {scoreItems.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-slate-800">{item.label}</span>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                {item.value ?? '—'}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              {item.helper || 'Sin detalle'}
                              {item.flags !== undefined ? (
                                <span className="mt-1 block text-[11px] text-slate-400">
                                  {item.flags.length
                                    ? `Flags: ${item.flags.join(', ')}`
                                    : 'Sin flags'}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">
                        Aún no existe un desglose de score. Ejecuta el scoring automático para verlo aquí.
                      </p>
                    )}
                  </section>

                  <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-500">Información clave</div>
                    <dl className="mt-3 space-y-2 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500">ID interno</dt>
                        <dd className="font-semibold">#{detail.id}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500">Etapa</dt>
                        <dd className="font-semibold">{stageChip}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500">Score final</dt>
                        <dd className="font-semibold">
                          {finalScore === null ? 'Pendiente' : finalScore.toFixed(2)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500">Última actualización</dt>
                        <dd className="font-semibold">
                          {detail.scoreBreakdown?.createdAt
                            ? formatLocal(detail.scoreBreakdown.createdAt)
                            : 'Sin registrar'}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>

                <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-500">Respuestas del formulario</div>
                      <p className="text-xs text-slate-400">
                        {answers.length} respuesta{answers.length === 1 ? '' : 's'} recopiladas
                      </p>
                    </div>
                  </div>

                  {answers.length ? (
                    <div className="mt-4 space-y-4">
                      {answers.map((a, idx) => {
                        const key = `${idx}-${a.question}`;
                        const text = a.value || '';
                        const isExpanded = Boolean(expanded[key]);
                        const showToggle = text.trim().length > 240;

                        return (
                          <article key={key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                  Pregunta #{idx + 1}
                                </p>
                                <h4 className="text-sm font-semibold text-slate-800">
                                  {a.question || 'Respuesta abierta'}
                                </h4>
                              </div>
                              {showToggle ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
                                  }
                                  className="text-xs font-medium text-blue-700 hover:text-blue-900"
                                >
                                  {isExpanded ? 'Ver menos' : 'Ver más'}
                                </button>
                              ) : null}
                            </div>
                            <div className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                              {isUrlLike(text) ? (
                                <a
                                  href={text.trim()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-700 underline"
                                >
                                  {text.trim()}
                                </a>
                              ) : (
                                <span>{isExpanded ? text : clampText(text, 240)}</span>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
                      No hay respuestas registradas para esta persona.
                    </p>
                  )}
                </section>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-500">
                No encontramos información detallada para este candidato.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
