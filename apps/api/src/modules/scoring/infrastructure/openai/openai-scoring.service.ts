import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

type AiEvalInput = {
  candidateId: number;
  candidateName: string;
  jobId: number;
  cvUrl: string;
  rawAnswers: unknown;
};

export type ScoreDimension = { score: number; reason: string };

export type AiEvalOutput = {
  relevance: ScoreDimension;
  experience: ScoreDimension;
  motivation: ScoreDimension;
  risk: ScoreDimension; // <- dimensión (score+reason)
  riskFlags: string[]; // <- flags aparte
};

@Injectable()
export class OpenAiScoringService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY is missing');

    this.model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4.1-mini';
    this.client = new OpenAI({ apiKey });
  }

  async evaluateCandidate(input: AiEvalInput): Promise<AiEvalOutput> {
    const answersText = normalizeAnswers(input.rawAnswers);

    const prompt = [
      `You are assisting a hiring manager by scoring a candidate.`,
      `Return ONLY valid JSON. No markdown.`,
      ``,
      `Candidate: ${input.candidateName} (id=${input.candidateId})`,
      `JobId: ${input.jobId}`,
      `CV URL: ${input.cvUrl}`,
      ``,
      `Application answers (verbatim):`,
      answersText || '(no answers)',
      ``,
      `Rubric (scores 1-5):`,
      `- relevance: fit/alignment to the role/team based on answers`,
      `- experience: evidence of scope/ownership/impact`,
      `- motivation: specificity and clarity of interest`,
      `- risk: risk/concerns (1-5 where 1 is low risk). Provide reason.`,
      `Also provide riskFlags: array of short strings (max 20)`,
      ``,
      `JSON schema:`,
      `{"relevance":{"score":1,"reason":"..."}, "experience":{"score":1,"reason":"..."}, "motivation":{"score":1,"reason":"..."}, "risk":{"score":1,"reason":"..."}, "riskFlags":["..."]}`,
    ].join('\n');

    const resp = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const text = resp.choices[0]?.message?.content ?? '{}';

    const parsedUnknown = safeJsonParse(text);
    const parsed = coerceAiEval(parsedUnknown);

    return parsed;
  }
}

/* ------------------------ parsing & validation ------------------------ */

function safeJsonParse(text: string): unknown {
  // intenta parsear directo; si falla, intenta extraer el primer bloque {...}
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = text.slice(start, end + 1);
      try {
        return JSON.parse(slice) as unknown;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function coerceAiEval(x: unknown): AiEvalOutput {
  const base: AiEvalOutput = {
    relevance: { score: 3, reason: 'No reason provided' },
    experience: { score: 3, reason: 'No reason provided' },
    motivation: { score: 3, reason: 'No reason provided' },
    risk: { score: 1, reason: 'No reason provided' }, // riesgo bajo por defecto
    riskFlags: [],
  };

  if (!isRecord(x)) return base;

  const relevance = coerceDimension(x['relevance'], 3);
  const experience = coerceDimension(x['experience'], 3);
  const motivation = coerceDimension(x['motivation'], 3);
  const risk = coerceDimension(x['risk'], 1);

  const riskFlags = coerceStringArray(x['riskFlags']).slice(0, 20);

  return { relevance, experience, motivation, risk, riskFlags };
}

function coerceDimension(x: unknown, defaultScore: number): ScoreDimension {
  const score = clamp1to5(getNumberField(x, 'score', defaultScore));
  const reason = getStringField(x, 'reason', 'No reason provided');
  return { score, reason };
}

function getNumberField(obj: unknown, key: string, fallback: number): number {
  if (!isRecord(obj)) return fallback;
  const v = obj[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function getStringField(obj: unknown, key: string, fallback: string): string {
  if (!isRecord(obj)) return fallback;
  const v = obj[key];
  return typeof v === 'string' && v.trim() ? v : fallback;
}

function coerceStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  const out: string[] = [];
  for (const item of x) {
    if (typeof item === 'string' && item.trim()) out.push(item.trim());
  }
  return out;
}

function clamp1to5(n: number): number {
  const rounded = Math.round(n);
  return Math.max(1, Math.min(5, rounded));
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

/* ------------------------ answers normalization ------------------------ */

function normalizeAnswers(raw: unknown): string {
  // rawAnswers puede venir como:
  // 1) { answers: [{question, value}] }
  // 2) [{question, value}]
  const arr =
    isRecord(raw) && Array.isArray(raw['answers'])
      ? raw['answers']
      : Array.isArray(raw)
        ? raw
        : null;

  if (!arr) return '';

  const lines: string[] = [];
  for (const item of arr) {
    if (!isRecord(item)) continue;

    const q = item['question'];
    const v = item['value'];

    const question = typeof q === 'string' ? q.trim() : '';
    const value = typeof v === 'string' ? v.trim() : '';

    if (!question && !value) continue;
    lines.push(
      `- Q: ${question || '(no question)'}\n  A: ${value || '(empty)'}`,
    );
  }

  return lines.join('\n');
}
