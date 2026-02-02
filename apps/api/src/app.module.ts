import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/db/prisma.module';
import { ScoringModule } from './modules/scoring/scoring.module';

import { AppController } from './app.controller';
import { JobsModule } from './modules/jobs/jobs.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    JobsModule,
    ApplicationsModule,
    AnalyticsModule,
    ScoringModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
