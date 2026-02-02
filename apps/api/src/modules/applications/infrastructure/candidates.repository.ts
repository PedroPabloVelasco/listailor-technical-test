import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/db/prisma.service';
import { CandidateStage, Prisma } from '@prisma/client';

export type UpsertCandidateInput = {
  id: number;
  jobId: number;
  candidateName: string;
  cvUrl: string;
  rawAnswers: Prisma.InputJsonValue;
};

@Injectable()
export class CandidatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMany(candidates: UpsertCandidateInput[]): Promise<void> {
    if (candidates.length === 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.candidate.createMany({
        data: candidates.map((c) => ({
          id: c.id,
          jobId: c.jobId,
          candidateName: c.candidateName,
          cvUrl: c.cvUrl,
          rawAnswers: c.rawAnswers,
        })),
        skipDuplicates: true,
      });

      // 2️⃣ Initialize stage for candidates (idempotent)
      await tx.candidateStageState.createMany({
        data: candidates.map((c) => ({
          candidateId: c.id,
          stage: CandidateStage.INBOX,
        })),
        skipDuplicates: true,
      });
    });
  }

  async listByJob(jobId: number) {
    const rows = await this.prisma.candidate.findMany({
      where: { jobId },
      orderBy: { candidateName: 'asc' },
      select: {
        id: true,
        candidateName: true,
        cvUrl: true,
        stage: { select: { stage: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      candidateName: r.candidateName,
      cvUrl: r.cvUrl,
      stage: r.stage?.stage ?? CandidateStage.INBOX,
    }));
  }
}
