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

export const RUBRIC_VERSION = 'v1.0';
export const RUBRIC_WEIGHTS = {
  relevance: 0.35,
  experience: 0.35,
  motivation: 0.2,
  riskPenalty: 0.1,
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export function scoreWithRubric(signals: LlmSignals): ScoringResult {
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

  const final =
    RUBRIC_WEIGHTS.relevance * relevance.score +
    RUBRIC_WEIGHTS.experience * experience.score +
    RUBRIC_WEIGHTS.motivation * motivation.score -
    RUBRIC_WEIGHTS.riskPenalty * risk.score;

  return {
    relevance,
    experience,
    motivation,
    risk,
    finalScore: Math.round(clamp(final, 0, 5) * 100) / 100,
    rubricVersion: RUBRIC_VERSION,
  };
}
