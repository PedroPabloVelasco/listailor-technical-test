import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/db/prisma.service';

export type UpsertJobInput = { id: number; title: string; description: string };

@Injectable()
export class JobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMany(jobs: UpsertJobInput[]): Promise<void> {
    for (const job of jobs) {
      await this.prisma.job.upsert({
        where: { id: job.id },
        update: { title: job.title, description: job.description },
        create: { id: job.id, title: job.title, description: job.description },
      });
    }
  }

  async list() {
    return this.prisma.job.findMany({ orderBy: { id: 'asc' } });
  }
}
