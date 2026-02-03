import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MagicLinkService } from '../application/magic-link.service';
import { SessionService } from '../application/session.service';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { VerifyMagicLinkDto } from './dto/verify-magic-link.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly magicLink: MagicLinkService,
    private readonly sessions: SessionService,
  ) {}

  @Post('magic-link')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async requestMagicLink(@Body() dto: RequestMagicLinkDto) {
    const result = await this.magicLink.requestLink(dto.email, dto.redirectUri);
    return {
      ok: true,
      expiresAt: result.expiresAt.toISOString(),
      previewLink: result.previewLink,
    };
  }

  @Post('magic-link/verify')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async verifyMagicLink(@Body() dto: VerifyMagicLinkDto) {
    const ticket = await this.magicLink.consume(dto.token);
    const session = await this.sessions.create(ticket.email);

    return {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    };
  }
}
