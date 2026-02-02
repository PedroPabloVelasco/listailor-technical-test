export type ScoreDimensionResult = {
  score: number;
  reason: string;
};

export type CandidateScoreResult = {
  candidateId: number;
  relevance: ScoreDimensionResult;
  experience: ScoreDimensionResult;
  motivation: ScoreDimensionResult;
  risk: ScoreDimensionResult;
  riskFlags?: string[];
  finalScore: number;
};
