import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MagicLinkMailer {
  private readonly logger = new Logger(MagicLinkMailer.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async send(email: string, link: string): Promise<{ previewLink?: string }> {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    const from =
      this.config.get<string>('AUTH_MAGIC_FROM_EMAIL') ??
      'Listailor Access <access@listailor.dev>';

    if (!apiKey) {
      this.logger.warn(
        `SENDGRID_API_KEY missing. Magic link for ${email}: ${link}`,
      );
      return { previewLink: link };
    }

    try {
      await this.http.axiosRef.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [
            {
              to: [{ email }],
            },
          ],
          from: { email: from },
          subject: 'Tu acceso a Listailor',
          content: [
            {
              type: 'text/html',
              value: this.buildBody(link),
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return {};
    } catch (error) {
      this.logger.error('Failed to send magic link email', error as Error);
      throw new InternalServerErrorException('No se pudo enviar el correo');
    }
  }

  private buildBody(link: string): string {
    return `
      <p>Hola 👋</p>
      <p>Usa este enlace para entrar a Listailor:</p>
      <p><a href="${link}">${link}</a></p>
      <p>El enlace expira pronto o al primer uso.</p>
    `;
  }
}
