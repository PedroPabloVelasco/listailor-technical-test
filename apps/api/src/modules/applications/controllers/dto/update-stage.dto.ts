import { IsEnum } from 'class-validator';
import { CandidateStage } from '@prisma/client';

export class UpdateStageDto {
  @IsEnum(CandidateStage)
  stage!: CandidateStage;
}
