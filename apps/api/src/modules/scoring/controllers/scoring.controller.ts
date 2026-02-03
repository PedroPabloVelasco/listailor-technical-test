import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ScoreCandidateUseCase } from '../application/score-candidate.usecase';
import { RUBRIC_VERSION, RUBRIC_WEIGHTS } from '../domain/rubric';
import { ScoringRepository } from '../infrastructure/scoring.repository';
import { SessionAuthGuard } from '../../auth/application/session.guard';

@Controller()
@UseGuards(SessionAuthGuard)
export class ScoringController {
  constructor(
    private readonly scoreCandidate: ScoreCandidateUseCase,
    private readonly scoringRepo: ScoringRepository,
  ) {}

  @Get('/scoring/rubric')
  getRubric() {
    return {
      version: RUBRIC_VERSION,
      weights: RUBRIC_WEIGHTS,
      notes:
        'Pesos calibrados para perfiles operativos fintech. Se aplican sobre puntajes 1-5.',
    };
  }

  @Post('/candidates/:candidateId/score')
  async score(@Param('candidateId', ParseIntPipe) candidateId: number) {
    const saved = await this.scoreCandidate.execute(candidateId);

    return {
      candidateId: saved.candidateId,
      finalScore: saved.finalScore,
      relevance: {
        score: saved.relevanceScore,
        reason: saved.relevanceReason,
      },
      experience: {
        score: saved.experienceScore,
        reason: saved.experienceReason,
      },
      motivation: {
        score: saved.motivationScore,
        reason: saved.motivationReason,
      },
      risk: {
        score: saved.riskScore,
        flags: saved.riskFlags,
      },
      createdAt: saved.createdAt,
    };
  }

  @Put('/candidates/:candidateId/final-score')
  async updateFinalScore(
    @Param('candidateId', ParseIntPipe) candidateId: number,
    @Body('finalScore') finalScore?: number,
  ) {
    if (typeof finalScore !== 'number' || Number.isNaN(finalScore)) {
      throw new Error('finalScore must be a valid number');
    }
    const updated = await this.scoringRepo.updateFinalScore(
      candidateId,
      Number(finalScore.toFixed(2)),
    );
    return {
      candidateId: updated.candidateId,
      finalScore: updated.finalScore,
    };
  }
}
