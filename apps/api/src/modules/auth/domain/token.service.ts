import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';

@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService) {}

  generateToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }

  hashToken(token: string): string {
    return createHmac('sha256', this.secret).update(token).digest('hex');
  }

  private get secret(): string {
    const secret = this.config.get<string>('AUTH_MAGIC_SECRET');
    if (!secret) {
      throw new Error('AUTH_MAGIC_SECRET is not configured');
    }
    return secret;
  }
}
