import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';

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
  risk: ScoreDimension;
  riskFlags: string[];
};

@Injectable()
export class OpenAiScoringService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly logger = new Logger(OpenAiScoringService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY is missing');

    this.model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
    this.client = new OpenAI({ apiKey });
  }

  async evaluateCandidate(input: AiEvalInput): Promise<AiEvalOutput> {
    // 1. Obtener texto real del PDF
    let cvText = '';
    try {
      cvText = await this.getTextFromPdf(input.cvUrl);
    } catch (error) {
      this.logger.error(
        `Error reading PDF for candidate ${input.candidateId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      cvText = '(Could not read CV PDF content. Score based on answers only)';
    }

    const answersText = normalizeAnswers(input.rawAnswers);

    const prompt = [
      `Eres un analista de talento que puntúa a un candidato en español neutro.`,
      `Regresa ÚNICAMENTE JSON válido (sin markdown, sin texto extra).`,
      ``,
      `Candidato: ${input.candidateName} (id=${input.candidateId})`,
      `JobId: ${input.jobId}`,
      ``,
      `--- CONTENIDO CV (INICIO) ---`,
      cvText.slice(0, 20000), // Limite de seguridad
      `--- CONTENIDO CV (FIN) ---`,
      ``,
      `Respuestas de la aplicación (texto literal):`,
      answersText || '(sin respuestas)',
      ``,
      `Rúbrica (puntajes 1-5):`,
      `- relevance: ajuste al rol/equipo basándose en CV y respuestas`,
      `- experience: evidencia de alcance/impacto/liderazgo en el CV`,
      `- motivation: claridad y especificidad del interés en el puesto`,
      `- risk: riesgos o banderas (1 = bajo riesgo). Explica.`,
      ``,
      `Guía de puntuación (usa 1-5 con dispersión realista):`,
      `- 5: evidencia sobresaliente y específica.`,
      `- 4: señales claras de excelencia, pero aún con oportunidades.`,
      `- 3: estándar; lo suficiente para el puesto sin destacar.`,
      `- 2: dudas relevantes o evidencia limitada.`,
      `- 1: señales negativas o ausencia de datos.`,
      `Siempre referencia datos del CV o respuestas; si algo falta, dilo explícitamente.`,
      `Incluye riskFlags: arreglo de strings cortos (máx 20) cuando existan banderas.`,
      `Todas las razones deben estar en español claro.`,
      ``,
      `JSON schema:`,
      `{"relevance":{"score":1,"reason":"..."}, "experience":{"score":1,"reason":"..."}, "motivation":{"score":1,"reason":"..."}, "risk":{"score":1,"reason":"..."}, "riskFlags":["..."]}`,
    ].join('\n');

    const resp = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const text = resp.choices[0]?.message?.content ?? '{}';

    const parsedUnknown = safeJsonParse(text);
    const parsed = coerceAiEval(parsedUnknown);

    return parsed;
  }

  private async getTextFromPdf(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.statusText}`);

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: buffer });
    try {
      const { text } = await parser.getText();
      return text.replace(/\n+/g, ' ').trim();
    } finally {
      await parser.destroy();
    }
  }
}

/* ------------------------ parsing & validation ------------------------ */

function safeJsonParse(text: string): unknown {
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
    relevance: { score: 3, reason: 'Analysis failed or invalid JSON' },
    experience: { score: 3, reason: 'Analysis failed or invalid JSON' },
    motivation: { score: 3, reason: 'Analysis failed or invalid JSON' },
    risk: { score: 1, reason: 'Analysis failed or invalid JSON' },
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
