import OpenAI from 'openai';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OpenAiClient {
  private readonly client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
    this.client = new OpenAI({ apiKey });
  }

  get() {
    return this.client;
  }
}
