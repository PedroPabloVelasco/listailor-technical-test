import { apiFetch } from './client';

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
};

export function fetchJobs() {
  return apiFetch<Job[]>('/jobs');
}

export function fetchCandidates(jobId: number) {
  return apiFetch<Candidate[]>(`/jobs/${jobId}/candidates`);
}
