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

export type CandidateListItem = {
  id: number;
  candidateName: string;
  cvUrl: string;
  stage: CandidateStage;
  finalScore: number | null;
  relevanceScore: number | null;
  experienceScore: number | null;
  motivationScore: number | null;
  riskScore: number | null;
  riskFlags: string[];
  lastScoredAt: string | null;
};

export type CandidateOverviewItem = CandidateListItem & {
  jobId: number;
  jobTitle: string;
  jobDescription: string | null;
};

export type CandidateDetail = {
  id: number;
  candidateName: string;
  cvUrl: string;
  stage: CandidateStage;
  rawAnswers: Prisma.JsonValue;
  finalScore: number | null;
  scoreBreakdown: {
    relevanceScore: number;
    relevanceReason: string;
    experienceScore: number;
    experienceReason: string;
    motivationScore: number;
    motivationReason: string;
    riskScore: number;
    riskReason: string;
    riskFlags: string[];
    createdAt: string;
  } | null;
};

@Injectable()
export class CandidatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMany(candidates: UpsertCandidateInput[]): Promise<void> {
    if (candidates.length === 0) return;

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

      await tx.candidateStageState.createMany({
        data: candidates.map((c) => ({
          candidateId: c.id,
          stage: CandidateStage.INBOX,
        })),
        skipDuplicates: true,
      });
    });
  }

  async listByJob(jobId: number): Promise<CandidateListItem[]> {
    const rows = await this.prisma.candidate.findMany({
      where: { jobId },
      orderBy: { candidateName: 'asc' },
      select: {
        id: true,
        candidateName: true,
        cvUrl: true,
        stage: { select: { stage: true } },
        score: {
          select: {
            finalScore: true,
            relevanceScore: true,
            experienceScore: true,
            motivationScore: true,
            riskScore: true,
            riskFlags: true,
            createdAt: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      candidateName: r.candidateName,
      cvUrl: r.cvUrl,
      stage: r.stage?.stage ?? CandidateStage.INBOX,
      finalScore: r.score?.finalScore ?? null,
      relevanceScore: r.score?.relevanceScore ?? null,
      experienceScore: r.score?.experienceScore ?? null,
      motivationScore: r.score?.motivationScore ?? null,
      riskScore: r.score?.riskScore ?? null,
      riskFlags: Array.isArray(r.score?.riskFlags)
        ? (r.score?.riskFlags as string[])
        : [],
      lastScoredAt: r.score?.createdAt ? r.score.createdAt.toISOString() : null,
    }));
  }

  async listOverview(): Promise<CandidateOverviewItem[]> {
    const rows = await this.prisma.candidate.findMany({
      orderBy: [{ jobId: 'asc' }, { candidateName: 'asc' }],
      select: {
        id: true,
        candidateName: true,
        cvUrl: true,
        jobId: true,
        job: { select: { title: true, description: true } },
        stage: { select: { stage: true } },
        score: {
          select: {
            finalScore: true,
            relevanceScore: true,
            experienceScore: true,
            motivationScore: true,
            riskScore: true,
            riskFlags: true,
            createdAt: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      candidateName: r.candidateName,
      cvUrl: r.cvUrl,
      jobId: r.jobId,
      jobTitle: r.job?.title ?? 'Rol sin nombre',
      jobDescription: r.job?.description ?? null,
      stage: r.stage?.stage ?? CandidateStage.INBOX,
      finalScore: r.score?.finalScore ?? null,
      relevanceScore: r.score?.relevanceScore ?? null,
      experienceScore: r.score?.experienceScore ?? null,
      motivationScore: r.score?.motivationScore ?? null,
      riskScore: r.score?.riskScore ?? null,
      riskFlags: Array.isArray(r.score?.riskFlags)
        ? (r.score?.riskFlags as string[])
        : [],
      lastScoredAt: r.score?.createdAt ? r.score.createdAt.toISOString() : null,
    }));
  }

  async getDetail(candidateId: number) {
    const row = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        candidateName: true,
        cvUrl: true,
        rawAnswers: true,
        stage: { select: { stage: true } },
        score: {
          select: {
            finalScore: true,
            relevanceScore: true,
            relevanceReason: true,
            experienceScore: true,
            experienceReason: true,
            motivationScore: true,
            motivationReason: true,
            riskScore: true,
            riskReason: true,
            riskFlags: true,
            createdAt: true,
          },
        },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      candidateName: row.candidateName,
      cvUrl: row.cvUrl,
      rawAnswers: row.rawAnswers,
      stage: row.stage?.stage ?? CandidateStage.INBOX,
      finalScore: row.score?.finalScore ?? null,
      scoreBreakdown: row.score
        ? {
            relevanceScore: row.score.relevanceScore,
            relevanceReason: row.score.relevanceReason,
            experienceScore: row.score.experienceScore,
            experienceReason: row.score.experienceReason,
            motivationScore: row.score.motivationScore,
            motivationReason: row.score.motivationReason,
            riskScore: row.score.riskScore,
            riskReason: row.score.riskReason,
            riskFlags: Array.isArray(row.score.riskFlags)
              ? (row.score.riskFlags as string[])
              : [],
            createdAt: row.score.createdAt.toISOString(),
          }
        : null,
    };
  }

  async exists(candidateId: number): Promise<boolean> {
    const found = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });

    return Boolean(found);
  }

  async updateStage(candidateId: number, stage: CandidateStage): Promise<void> {
    await this.prisma.candidateStageState.upsert({
      where: { candidateId },
      update: { stage },
      create: { candidateId, stage },
    });
  }

  async getDetailForScoring(candidateId: number): Promise<{
    id: number;
    jobId: number;
    candidateName: string;
    cvUrl: string;
    rawAnswers: unknown;
  } | null> {
    return this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        jobId: true,
        candidateName: true,
        cvUrl: true,
        rawAnswers: true,
      },
    });
  }
}
