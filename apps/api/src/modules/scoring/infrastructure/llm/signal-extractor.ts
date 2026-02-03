import { Injectable } from '@nestjs/common';
import { OpenAiClient } from './openai.client';
import type { LlmSignals } from './llm.types';

type Answer = { question: string; value: string };
type CandidateContext = {
  jobTitle?: string;
  jobDescription?: string;
  answers: Answer[];
};

function safeTrim(s: string, max = 6000) {
  return s.length > max ? s.slice(0, max) : s;
}

@Injectable()
export class SignalExtractor {
  constructor(private readonly openai: OpenAiClient) {}

  async extract(ctx: CandidateContext): Promise<LlmSignals> {
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    const answersText = ctx.answers
      .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.value}`)
      .join('\n\n');

    const system = `
You are an assistant that extracts structured hiring signals.
Return ONLY valid JSON that matches the required shape.
No markdown. No extra keys. No commentary.
Keep evidence snippets short and directly quoted from answers.
`.trim();

    const user = `
Job:
- title: ${ctx.jobTitle ?? ''}
- description: ${ctx.jobDescription ?? ''}

Candidate application answers:
${safeTrim(answersText)}
`.trim();

    const res = await this.openai.get().chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `
Return a JSON object with this exact shape:

{
  "summary": "string (optional, max 400 chars)",
  "relevance": { "signals": ["..."], "evidence": [{"source":"answers","question":"...","snippet":"..."}] },
  "experience": { "signals": ["..."], "evidence": [{"source":"answers","question":"...","snippet":"..."}] },
  "motivation": { "signals": ["..."], "evidence": [{"source":"answers","question":"...","snippet":"..."}] },
  "risk": { "flags": ["..."], "evidence": [{"source":"answers","question":"...","snippet":"..."}] }
}

Rules:
- evidence.snippet must be a direct short quote from the candidate answer
- signals and flags must be concise
- if no evidence, return empty arrays

Now extract.
`.trim(),
        },
        { role: 'user', content: user },
      ],
    });

    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error('LLM returned empty response');

    const parsed = JSON.parse(text) as LlmSignals;

    if (
      !parsed.relevance ||
      !parsed.experience ||
      !parsed.motivation ||
      !parsed.risk
    ) {
      throw new Error('LLM output missing required keys');
    }

    return parsed;
  }
}
