import { Controller, Get, UseGuards } from '@nestjs/common';
import { JobsRepository } from '../infrastructure/jobs.repository';
import { SessionAuthGuard } from '../../auth/application/session.guard';

@Controller()
@UseGuards(SessionAuthGuard)
export class JobsController {
  constructor(private readonly jobsRepo: JobsRepository) {}

  @Get('/jobs')
  async listJobs() {
    return this.jobsRepo.list();
  }
}
