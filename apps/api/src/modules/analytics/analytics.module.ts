import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { JobsModule } from '../jobs/jobs.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [JobsModule, ApplicationsModule],
  controllers: [AdminController],
})
export class AnalyticsModule {}
