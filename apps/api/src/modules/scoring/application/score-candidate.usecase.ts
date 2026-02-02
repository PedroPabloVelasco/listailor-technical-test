import { CandidatesRepository } from '../../applications/infrastructure/candidates.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ScoringRepository } from '../infrastructure/scoring.repository';
import { OpenAiScoringService } from '../infrastructure/openai/openai-scoring.service';
import type { CandidateScoreResult } from '../domain/score.model';

@Injectable()
export class ScoreCandidateUseCase {
  constructor(
    private readonly openai: OpenAiScoringService,
    private readonly repo: ScoringRepository,
    private readonly candidatesRepo: CandidatesRepository,
  ) {}

  async execute(candidateId: number) {
    const candidate =
      await this.candidatesRepo.getDetailForScoring(candidateId);
    if (!candidate) {
      throw new NotFoundException(`Candidate with id ${candidateId} not found`);
    }

    const ai = await this.openai.evaluateCandidate({
      candidateId: candidate.id,
      candidateName: candidate.candidateName,
      jobId: candidate.jobId,
      cvUrl: candidate.cvUrl,
      rawAnswers: candidate.rawAnswers,
    });

    // OJO: risk.score aquí es “riesgo” (1 bajo, 5 alto)
    // Tu fórmula actual suma risk * 0.15, eso premiaría el riesgo alto.
    // Mejor: convertir a "riskPenalty" o "riskInversion".
    const riskInversion = 6 - ai.risk.score; // 5->1, 1->5

    const finalScore =
      ai.relevance.score * 0.35 +
      ai.experience.score * 0.25 +
      ai.motivation.score * 0.25 +
      riskInversion * 0.15;

    const result: CandidateScoreResult = {
      candidateId,
      relevance: ai.relevance,
      experience: ai.experience,
      motivation: ai.motivation,
      risk: { score: ai.risk.score, reason: ai.risk.reason },
      riskFlags: ai.riskFlags,
      finalScore: Number(finalScore.toFixed(2)),
    };

    return this.repo.save(result);
  }
}
