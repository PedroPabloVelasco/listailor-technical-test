import { Module } from '@nestjs/common';
import { CandidateScoringController } from './controllers/candidate-scoring.controller';
import { ScoringController } from './controllers/scoring.controller';
import { ScoreCandidateUseCase } from './application/score-candidate.usecase';
import { ScoringRepository } from './infrastructure/scoring.repository';
import { OpenAiScoringService } from './infrastructure/openai/openai-scoring.service';
import { CandidatesRepository } from '../applications/infrastructure/candidates.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CandidateScoringController, ScoringController],
  providers: [
    OpenAiScoringService,
    ScoringRepository,
    ScoreCandidateUseCase,
    CandidatesRepository,
  ],
})
export class ScoringModule {}
