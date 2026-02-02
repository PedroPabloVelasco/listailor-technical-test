import { Module } from '@nestjs/common';
import { CandidateScoringController } from './controllers/candidate-scoring.controller';
import { ScoreCandidateUseCase } from './application/score-candidate.usecase';
import { ScoringRepository } from './infrastructure/scoring.repository';
import { OpenAiScoringService } from './infrastructure/openai/openai-scoring.service';
import { CandidatesRepository } from '../applications/infrastructure/candidates.repository';

@Module({
  controllers: [CandidateScoringController],
  providers: [
    OpenAiScoringService,
    ScoringRepository,
    ScoreCandidateUseCase,
    CandidatesRepository,
  ],
})
export class ScoringModule {}
