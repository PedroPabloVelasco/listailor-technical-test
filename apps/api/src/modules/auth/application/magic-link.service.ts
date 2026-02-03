import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/db/prisma.service';
import { TokenService } from '../domain/token.service';
import { MagicLinkMailer } from '../infrastructure/magic-link.mailer';

const DEFAULT_MAGIC_TTL_MINUTES = 15;

@Injectable()
export class MagicLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mailer: MagicLinkMailer,
    private readonly config: ConfigService,
  ) {}

  async requestLink(
    email: string,
    redirectUri?: string,
  ): Promise<{ expiresAt: Date; previewLink?: string }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Email is required');
    }

    const token = this.tokens.generateToken();
    const tokenHash = this.tokens.hashToken(token);
    const expiresAt = new Date(Date.now() + this.magicTtlMs);

    await this.prisma.magicLinkTicket.create({
      data: { email: normalized, tokenHash, expiresAt },
    });

    const link = this.buildLink(token, redirectUri);
    const result = await this.mailer.send(normalized, link);
    return { expiresAt, previewLink: result.previewLink };
  }

  async consume(token: string) {
    const tokenHash = this.tokens.hashToken(token);
    const ticket = await this.prisma.magicLinkTicket.findUnique({
      where: { tokenHash },
    });

    if (!ticket) {
      throw new UnauthorizedException('Invalid link');
    }

    if (ticket.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Link expired');
    }

    const result = await this.prisma.magicLinkTicket.updateMany({
      where: { id: ticket.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    if (result.count === 0) {
      throw new UnauthorizedException('Link already used');
    }

    return ticket;
  }

  private buildLink(token: string, redirectUri?: string): string {
    if (redirectUri) {
      return `${redirectUri}?token=${encodeURIComponent(token)}`;
    }
    const base = this.config.get<string>('AUTH_MAGIC_APP_URL');
    if (!base) {
      throw new Error('AUTH_MAGIC_APP_URL is not configured');
    }
    return `${base.replace(/\/$/, '')}/auth/callback?token=${token}`;
  }

  private get magicTtlMs(): number {
    const envValue = this.config.get<string>('AUTH_MAGIC_TTL_MINUTES');
    const minutes = envValue ? Number(envValue) : DEFAULT_MAGIC_TTL_MINUTES;
    return Math.max(1, minutes) * 60 * 1000;
  }
}
