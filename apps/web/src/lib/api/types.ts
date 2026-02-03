export type Job = {
  id: number;
  title: string;
  description: string;
};

export type Candidate = {
  id: number;
  candidateName: string;
  cvUrl: string;
  stage: string;
  finalScore: number | null;
  relevanceScore: number | null;
  experienceScore: number | null;
  motivationScore: number | null;
  riskScore: number | null;
  riskFlags: string[];
  lastScoredAt: string | null;
};

export const CANDIDATE_STAGES = [
  'INBOX',
  'SHORTLIST',
  'MAYBE',
  'NO',
  'INTERVIEW',
  'OFFER',
] as const;

export type CandidateStage = (typeof CANDIDATE_STAGES)[number];

export type CandidateOverviewRow = Candidate & {
  jobId: number;
  jobTitle: string;
  jobDescription: string | null;
};

export type RubricConfig = {
  version: string;
  notes: string;
  weights: {
    relevance: number;
    experience: number;
    motivation: number;
    riskPenalty: number;
  };
};
