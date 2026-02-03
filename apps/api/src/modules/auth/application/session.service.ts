import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Session } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/db/prisma.service';
import { TokenService } from '../domain/token.service';

const DEFAULT_SESSION_TTL_MINUTES = 60 * 24; // 1 día

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  async create(email: string): Promise<{ token: string; expiresAt: Date }> {
    const token = this.tokens.generateToken(48);
    const tokenHash = this.tokens.hashToken(token);
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);

    await this.prisma.session.create({
      data: { email, tokenHash, expiresAt },
    });

    return { token, expiresAt };
  }

  async validate(token: string): Promise<Session> {
    const tokenHash = this.tokens.hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
    });

    if (!session) {
      throw new UnauthorizedException('Sesión inválida');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.session
        .delete({ where: { tokenHash } })
        .catch(() => {});
      throw new UnauthorizedException('Sesión expirada');
    }

    return session;
  }

  async revoke(token: string): Promise<void> {
    const tokenHash = this.tokens.hashToken(token);
    await this.prisma.session.delete({ where: { tokenHash } }).catch(() => {});
  }

  private get sessionTtlMs(): number {
    const envValue = this.config.get<string>('AUTH_SESSION_TTL_MINUTES');
    const minutes = envValue ? Number(envValue) : DEFAULT_SESSION_TTL_MINUTES;
    return Math.max(5, minutes) * 60 * 1000;
  }
}
