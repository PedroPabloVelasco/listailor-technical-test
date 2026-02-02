import { Injectable, NotFoundException } from '@nestjs/common';
import { CandidateStage } from '@prisma/client';
import { CandidatesRepository } from '../infrastructure/candidates.repository';

@Injectable()
export class UpdateCandidateStageUseCase {
  constructor(private readonly candidatesRepo: CandidatesRepository) {}

  async execute(candidateId: number, stage: CandidateStage): Promise<void> {
    const exists = await this.candidatesRepo.exists(candidateId);
    if (!exists) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }

    await this.candidatesRepo.updateStage(candidateId, stage);
  }
}
