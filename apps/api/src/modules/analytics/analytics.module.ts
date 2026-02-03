import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { JobsModule } from '../jobs/jobs.module';
import { ApplicationsModule } from '../applications/applications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [JobsModule, ApplicationsModule, AuthModule],
  controllers: [AdminController],
})
export class AnalyticsModule {}
