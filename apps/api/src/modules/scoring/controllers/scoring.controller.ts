import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ScoreCandidateUseCase } from '../application/score-candidate.usecase';

@Controller()
export class ScoringController {
  constructor(private readonly scoreCandidate: ScoreCandidateUseCase) {}

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
}
