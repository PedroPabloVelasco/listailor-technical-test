import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CandidatesRepository } from '../infrastructure/candidates.repository';

@Controller()
export class CandidateDetailController {
  constructor(private readonly repo: CandidatesRepository) {}

  @Get('/candidates/:candidateId')
  async get(@Param('candidateId', ParseIntPipe) candidateId: number) {
    const detail = await this.repo.getDetail(candidateId);
    if (!detail) throw new NotFoundException('Candidate not found');
    return detail;
  }
}
