import type { LlmSignals } from '../infrastructure/llm/llm.types';

export type DimensionResult = {
  score: number;
  reason: string;
  evidence: string[];
};
export type ScoringResult = {
  relevance: DimensionResult;
  experience: DimensionResult;
  motivation: DimensionResult;
  risk: { score: number; flags: string[]; evidence: string[] };
  finalScore: number;
  rubricVersion: string;
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export function scoreWithRubric(signals: LlmSignals): ScoringResult {
  // Heurísticas simples: número de señales + calidad de evidencia (aprox)
  const relevanceBase = clamp(
    2 + Math.min(3, signals.relevance.signals.length / 2),
    0,
    5,
  );
  const experienceBase = clamp(
    2 + Math.min(3, signals.experience.signals.length / 2),
    0,
    5,
  );
  const motivationBase = clamp(
    2 + Math.min(3, signals.motivation.signals.length / 2),
    0,
    5,
  );

  // Risk: más flags => mayor score de riesgo
  const riskScore = clamp(signals.risk.flags.length, 0, 5);

  const relevance = {
    score: Math.round(relevanceBase * 10) / 10,
    reason: signals.relevance.signals[0] ?? 'No strong relevance signals found',
    evidence: signals.relevance.evidence.map((e) => e.snippet).slice(0, 3),
  };

  const experience = {
    score: Math.round(experienceBase * 10) / 10,
    reason:
      signals.experience.signals[0] ?? 'No strong experience signals found',
    evidence: signals.experience.evidence.map((e) => e.snippet).slice(0, 3),
  };

  const motivation = {
    score: Math.round(motivationBase * 10) / 10,
    reason:
      signals.motivation.signals[0] ?? 'No strong motivation signals found',
    evidence: signals.motivation.evidence.map((e) => e.snippet).slice(0, 3),
  };

  const risk = {
    score: riskScore,
    flags: signals.risk.flags.slice(0, 5),
    evidence: signals.risk.evidence.map((e) => e.snippet).slice(0, 3),
  };

  // Pesos (opinionados y defendibles)
  const final =
    0.35 * relevance.score +
    0.35 * experience.score +
    0.2 * motivation.score -
    0.1 * risk.score;

  return {
    relevance,
    experience,
    motivation,
    risk,
    finalScore: Math.round(clamp(final, 0, 5) * 100) / 100,
    rubricVersion: 'v1.0',
  };
}
