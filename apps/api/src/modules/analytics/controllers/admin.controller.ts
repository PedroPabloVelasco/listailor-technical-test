import { Controller, Logger, Post } from '@nestjs/common';
import { SyncJobsUseCase } from '../../jobs/application/sync-jobs.usecase';
import { SyncApplicationsUseCase } from '../../applications/application/sync-applications.usecase';

@Controller()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly syncJobs: SyncJobsUseCase,
    private readonly syncApplications: SyncApplicationsUseCase,
  ) {}

  @Post('/admin/sync')
  async syncAll() {
    this.logger.log('Sync start');

    this.logger.log('Sync jobs...');
    const jobs = await this.syncJobs.execute();
    this.logger.log(`Sync jobs done: ${jobs.synced}`);

    this.logger.log('Sync applications...');
    const applications = await this.syncApplications.execute();
    this.logger.log(`Sync applications done: ${applications.synced}`);

    this.logger.log('Sync end');
    return { jobs, applications };
  }
}
