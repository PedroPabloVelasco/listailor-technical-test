import { Injectable } from '@nestjs/common';
import { ExternalApiClient } from '../../applications/infrastructure/external-api.client';
import { JobsRepository } from '../infrastructure/jobs.repository';

@Injectable()
export class SyncJobsUseCase {
  constructor(
    private readonly externalApi: ExternalApiClient,
    private readonly jobsRepo: JobsRepository,
  ) {}

  async execute(): Promise<{ synced: number }> {
    const jobs = await this.externalApi.fetchJobs();
    await this.jobsRepo.upsertMany(
      jobs.map((j) => ({
        id: j.id,
        title: j.title,
        description: j.description,
      })),
    );
    return { synced: jobs.length };
  }
}
