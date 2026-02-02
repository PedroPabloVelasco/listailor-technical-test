import { Controller, Get } from '@nestjs/common';
import { JobsRepository } from '../infrastructure/jobs.repository';

@Controller()
export class JobsController {
  constructor(private readonly jobsRepo: JobsRepository) {}

  @Get('/jobs')
  async listJobs() {
    return this.jobsRepo.list();
  }
}
