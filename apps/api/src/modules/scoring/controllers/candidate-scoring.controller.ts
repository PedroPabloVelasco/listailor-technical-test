import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ScoreCandidateUseCase } from '../application/score-candidate.usecase';

@Controller('candidates')
export class CandidateScoringController {
  constructor(private readonly scoreCandidate: ScoreCandidateUseCase) {}

  @Post(':candidateId/score')
  async score(@Param('candidateId', ParseIntPipe) candidateId: number) {
    return this.scoreCandidate.execute(candidateId);
  }
}
