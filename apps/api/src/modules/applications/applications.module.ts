import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '../auth/auth.module';
import { CandidatesController } from './controllers/candidates.controller';
import { CandidateDetailController } from './controllers/candidate-detail.controller';
import { ExternalApiClient } from './infrastructure/external-api.client';
import { CandidatesRepository } from './infrastructure/candidates.repository';
import { SyncApplicationsUseCase } from './application/sync-applications.usecase';
import { UpdateCandidateStageUseCase } from './application/update-candidate-stage.usecase';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [CandidatesController, CandidateDetailController],
  providers: [
    ExternalApiClient,
    CandidatesRepository,
    SyncApplicationsUseCase,
    UpdateCandidateStageUseCase,
  ],
  exports: [ExternalApiClient, CandidatesRepository, SyncApplicationsUseCase],
})
export class ApplicationsModule {}
