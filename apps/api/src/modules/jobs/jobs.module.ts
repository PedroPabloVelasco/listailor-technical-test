import { Module } from '@nestjs/common';
import { JobsController } from './controllers/jobs.controller';
import { JobsRepository } from './infrastructure/jobs.repository';
import { SyncJobsUseCase } from './application/sync-jobs.usecase';
import { ApplicationsModule } from '../applications/applications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ApplicationsModule, AuthModule],
  controllers: [JobsController],
  providers: [JobsRepository, SyncJobsUseCase],
  exports: [JobsRepository, SyncJobsUseCase],
})
export class JobsModule {}
