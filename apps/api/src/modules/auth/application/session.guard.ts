import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionService } from './session.service';

declare module 'express' {
  interface Request {
    session?: {
      id: string;
      email: string;
    };
  }
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Falta token de sesión');
    }

    const session = await this.sessions.validate(token);
    req.session = { id: session.id, email: session.email };
    return true;
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.slice(7).trim();
    }

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('session='));
      if (match) {
        return decodeURIComponent(match.split('=')[1] ?? '');
      }
    }

    return null;
  }
}
