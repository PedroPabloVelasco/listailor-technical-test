import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './controllers/auth.controller';
import { MagicLinkService } from './application/magic-link.service';
import { SessionService } from './application/session.service';
import { TokenService } from './domain/token.service';
import { MagicLinkMailer } from './infrastructure/magic-link.mailer';
import { SessionAuthGuard } from './application/session.guard';
import { PrismaModule } from '../../infrastructure/db/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [AuthController],
  providers: [
    MagicLinkService,
    SessionService,
    TokenService,
    MagicLinkMailer,
    SessionAuthGuard,
  ],
  exports: [SessionAuthGuard, SessionService],
})
export class AuthModule {}
