/* eslint-disable
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-member-access
*/

import {
  Injectable,
  OnModuleInit,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

type PrismaAdapter = ConstructorParameters<typeof PrismaClient>[0] extends {
  adapter: infer A;
}
  ? A
  : never;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, BeforeApplicationShutdown
{
  private readonly pool: Pool;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is missing. Check apps/api/.env');
    }

    const pool = new Pool({ connectionString: url });

    // Prisma v7: adapter is required for direct DB connections when URLs are not in schema.
    // adapter-pg typing can be looser; cast once to keep the rest of the code safe.
    const adapter = new PrismaPg(pool) as unknown as PrismaAdapter;

    super({ adapter });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async beforeApplicationShutdown(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
