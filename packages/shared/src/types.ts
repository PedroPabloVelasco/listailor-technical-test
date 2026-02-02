export const CandidateStage = {
  INBOX: "INBOX",
  SHORTLIST: "SHORTLIST",
  MAYBE: "MAYBE",
  NO: "NO",
  INTERVIEW: "INTERVIEW",
  OFFER: "OFFER",
} as const;

export type CandidateStage = (typeof CandidateStage)[keyof typeof CandidateStage];
