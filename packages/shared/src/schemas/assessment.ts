import { z } from "zod";

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export const EvidenceSourceSchema = z.enum(["cv", "answer"]);
export const DimensionKeySchema = z.enum([
  "role_fit",
  "seniority_ownership",
  "problem_solving",
  "communication",
  "motivation",
  "risk_flags",
]);

export const EvidenceSchema = z.object({
  source: EvidenceSourceSchema,
  quote: z.string().min(1).max(400),
  location: z.string().min(1).max(120), // ej: "CV" o "Cover Letter"
});

export const DimensionSchema = z.object({
  key: DimensionKeySchema,
  score_0_to_4: z.number().min(0).max(4),
  rationale_bullets: z.array(z.string().min(1).max(200)).min(1).max(6),
  evidence: z.array(EvidenceSchema).min(1).max(6),
  confidence: ConfidenceSchema,
});

export const RedFlagSchema = z.object({
  flag: z.string().min(1).max(60),      // ej "job_hopping"
  severity: z.enum(["low", "medium", "high"]),
  detail: z.string().min(1).max(240),
});

export const AssessmentResultSchema = z.object({
  schema_version: z.literal("1.0"),
  job_title: z.string().min(1).max(120),
  candidate_name: z.string().min(1).max(120),

  overall: z.object({
    score_0_to_4: z.number().min(0).max(4),
    summary_bullets: z.array(z.string().min(1).max(200)).min(1).max(6),
    confidence: ConfidenceSchema,
  }),

  dimensions: z.array(DimensionSchema).length(6),

  red_flags: z.array(RedFlagSchema).max(8),

  extracted_signals: z.object({
    skills: z.array(z.string().min(1).max(40)).max(30),
    years_experience_estimate: z.number().min(0).max(60),
    roles_seen: z.array(z.string().min(1).max(60)).max(20),
  }),
});
