import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CandidatesRepository } from '../infrastructure/candidates.repository';

@Controller()
export class CandidatesController {
  constructor(private readonly candidatesRepo: CandidatesRepository) {}

  @Get('/jobs/:jobId/candidates')
  async listCandidates(@Param('jobId', ParseIntPipe) jobId: number) {
    return this.candidatesRepo.listByJob(jobId);
  }
}
