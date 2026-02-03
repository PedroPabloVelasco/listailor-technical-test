import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ScoreCandidateUseCase } from '../application/score-candidate.usecase';
import { SessionAuthGuard } from '../../auth/application/session.guard';

@Controller('candidates')
@UseGuards(SessionAuthGuard)
export class CandidateScoringController {
  constructor(private readonly scoreCandidate: ScoreCandidateUseCase) {}

  @Post(':candidateId/score')
  async score(@Param('candidateId', ParseIntPipe) candidateId: number) {
    return this.scoreCandidate.execute(candidateId);
  }
}
