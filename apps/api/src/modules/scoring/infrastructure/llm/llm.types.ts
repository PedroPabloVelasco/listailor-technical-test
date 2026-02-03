export type Evidence = {
  source: 'answers';
  question?: string;
  snippet: string;
};

export type LlmSignals = {
  summary?: string;

  relevance: {
    signals: string[];
    evidence: Evidence[];
  };

  experience: {
    signals: string[];
    evidence: Evidence[];
  };

  motivation: {
    signals: string[];
    evidence: Evidence[];
  };

  risk: {
    flags: string[];
    evidence: Evidence[];
  };
};
