import { Injectable } from '@nestjs/common';
import { ScoreDimensionResult } from '../../domain/score.model';

@Injectable()
export class MotivationEvaluator {
  evaluate(): ScoreDimensionResult {
    return {
      score: 3,
      reason: 'Baseline motivation score',
    };
  }
}
