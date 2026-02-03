import { backendGet } from '@/lib/server/backend';
import type {
  Job,
  Candidate,
  CandidateOverviewRow,
  RubricConfig,
} from '@/lib/api/types';

export async function fetchJobs(): Promise<Job[]> {
  return backendGet<Job[]>('/jobs');
}

export async function fetchCandidates(jobId: number): Promise<Candidate[]> {
  return backendGet<Candidate[]>(`/jobs/${jobId}/candidates`);
}

export async function fetchCandidatesOverview(): Promise<CandidateOverviewRow[]> {
  return backendGet<CandidateOverviewRow[]>('/candidates/overview');
}

export async function fetchRubricConfig(): Promise<RubricConfig> {
  return backendGet<RubricConfig>('/scoring/rubric');
}
