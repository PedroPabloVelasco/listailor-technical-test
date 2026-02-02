import { Injectable } from '@nestjs/common';
import type { ScoreDimensionResult } from '../../domain/score.model';

@Injectable()
export class RiskEvaluator {
  evaluate(): ScoreDimensionResult {
    return {
      score: 1,
      reason: 'No risk signals evaluated yet',
    };
  }
}
