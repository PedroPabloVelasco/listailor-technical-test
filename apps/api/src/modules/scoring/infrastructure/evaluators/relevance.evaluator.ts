import { Injectable } from '@nestjs/common';
import { ScoreDimensionResult } from '../../domain/score.model';

@Injectable()
export class RelevanceEvaluator {
  evaluate(): ScoreDimensionResult {
    return {
      score: 3,
      reason: 'Baseline relevance score (not yet analyzed)',
    };
  }
}
