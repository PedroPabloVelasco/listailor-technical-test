import { Injectable } from '@nestjs/common';
import { ExternalApiClient } from '../infrastructure/external-api.client';
import { CandidatesRepository } from '../infrastructure/candidates.repository';

@Injectable()
export class SyncApplicationsUseCase {
  constructor(
    private readonly externalApi: ExternalApiClient,
    private readonly candidatesRepo: CandidatesRepository,
  ) {}

  async execute(): Promise<{ synced: number }> {
    const apps = await this.externalApi.fetchApplications();

    await this.candidatesRepo.upsertMany(
      apps.map((a) => ({
        id: a.id,
        jobId: a.job_id,
        candidateName: a.candidate_name,
        cvUrl: a.cv_url,
        rawAnswers: { answers: a.answers },
      })),
    );

    return { synced: apps.length };
  }
}
