export type Evidence = {
  source: 'answers';
  question?: string;
  snippet: string; // <= 160 chars ideal
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
