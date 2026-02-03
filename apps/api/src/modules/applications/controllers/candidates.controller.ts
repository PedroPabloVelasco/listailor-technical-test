import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CandidatesRepository } from '../infrastructure/candidates.repository';
import { UpdateCandidateStageUseCase } from '../application/update-candidate-stage.usecase';
import { UpdateStageDto } from './dto/update-stage.dto';

@Controller()
export class CandidatesController {
  constructor(
    private readonly candidatesRepo: CandidatesRepository,
    private readonly updateStageUc: UpdateCandidateStageUseCase,
  ) {}

  @Get('/jobs/:jobId/candidates')
  async listCandidates(@Param('jobId', ParseIntPipe) jobId: number) {
    return this.candidatesRepo.listByJob(jobId);
  }

  @Get('/candidates/overview')
  async overview() {
    return this.candidatesRepo.listOverview();
  }

  @Get('/candidates/:candidateId')
  async getCandidate(@Param('candidateId', ParseIntPipe) candidateId: number) {
    const detail = await this.candidatesRepo.getDetail(candidateId);
    if (!detail) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }
    return detail;
  }

  @Patch('/candidates/:candidateId/stage')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateStage(
    @Param('candidateId', ParseIntPipe) candidateId: number,
    @Body() dto: UpdateStageDto,
  ) {
    await this.updateStageUc.execute(candidateId, dto.stage);
    return { ok: true };
  }
}
