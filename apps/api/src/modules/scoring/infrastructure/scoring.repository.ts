import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/db/prisma.service';
import type { CandidateScoreResult } from '../domain/score.model';
import type { CandidateScore } from '@prisma/client';

@Injectable()
export class ScoringRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(result: CandidateScoreResult): Promise<CandidateScore> {
    const riskFlags = Array.isArray(result.riskFlags) ? result.riskFlags : [];

    return this.prisma.candidateScore.upsert({
      where: { candidateId: result.candidateId },
      update: {
        relevanceScore: result.relevance.score,
        relevanceReason: result.relevance.reason,
        experienceScore: result.experience.score,
        experienceReason: result.experience.reason,
        motivationScore: result.motivation.score,
        motivationReason: result.motivation.reason,
        riskScore: result.risk.score,
        riskReason: result.risk.reason,
        riskFlags,
        finalScore: result.finalScore,
      },
      create: {
        candidateId: result.candidateId,
        relevanceScore: result.relevance.score,
        relevanceReason: result.relevance.reason,
        experienceScore: result.experience.score,
        experienceReason: result.experience.reason,
        motivationScore: result.motivation.score,
        motivationReason: result.motivation.reason,
        riskScore: result.risk.score,
        riskReason: result.risk.reason,
        riskFlags,
        finalScore: result.finalScore,
      },
    });
  }

  async updateFinalScore(
    candidateId: number,
    finalScore: number,
  ): Promise<CandidateScore> {
    const existing = await this.prisma.candidateScore.findUnique({
      where: { candidateId },
    });

    if (!existing) {
      throw new Error(
        `Candidate ${candidateId} does not have an existing score to update`,
      );
    }

    return this.prisma.candidateScore.update({
      where: { candidateId },
      data: { finalScore },
    });
  }
}
