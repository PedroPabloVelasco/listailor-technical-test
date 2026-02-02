import { backendGet } from '@/lib/server/backend';

export type Job = {
  id: number;
  title: string;
  description: string;
};

export async function fetchJobs(): Promise<Job[]> {
  return backendGet<Job[]>('/jobs');
}


export type Candidate = {
  id: number;
  candidateName: string;
  cvUrl: string;
  stage: string;
  finalScore: number | null;
};

export async function fetchCandidates(jobId: number): Promise<Candidate[]> {
  return backendGet<Candidate[]>(`/jobs/${jobId}/candidates`);
}

export const CANDIDATE_STAGES = [
  'INBOX',
  'SHORTLIST',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
] as const;

export type CandidateStage = (typeof CANDIDATE_STAGES)[number];

