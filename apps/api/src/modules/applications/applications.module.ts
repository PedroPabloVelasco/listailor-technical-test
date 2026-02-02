import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CandidatesController } from './controllers/candidates.controller';
import { ExternalApiClient } from './infrastructure/external-api.client';
import { CandidatesRepository } from './infrastructure/candidates.repository';
import { SyncApplicationsUseCase } from './application/sync-applications.usecase';
import { UpdateCandidateStageUseCase } from './application/update-candidate-stage.usecase';

@Module({
  imports: [HttpModule],
  controllers: [CandidatesController],
  providers: [
    ExternalApiClient,
    CandidatesRepository,
    SyncApplicationsUseCase,
    UpdateCandidateStageUseCase,
  ],
  exports: [ExternalApiClient, CandidatesRepository, SyncApplicationsUseCase],
})
export class ApplicationsModule {}
