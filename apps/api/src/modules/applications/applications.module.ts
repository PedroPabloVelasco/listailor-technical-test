import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CandidatesController } from './controllers/candidates.controller';
import { ExternalApiClient } from './infrastructure/external-api.client';
import { CandidatesRepository } from './infrastructure/candidates.repository';
import { SyncApplicationsUseCase } from './application/sync-applications.usecase';

@Module({
  imports: [HttpModule],
  controllers: [CandidatesController],
  providers: [ExternalApiClient, CandidatesRepository, SyncApplicationsUseCase],
  exports: [ExternalApiClient, CandidatesRepository, SyncApplicationsUseCase],
})
export class ApplicationsModule {}
