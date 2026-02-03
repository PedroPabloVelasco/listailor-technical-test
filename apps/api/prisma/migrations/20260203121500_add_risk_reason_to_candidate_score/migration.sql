-- Add riskReason column to CandidateScore
ALTER TABLE "CandidateScore" ADD COLUMN IF NOT EXISTS "riskReason" TEXT NOT NULL DEFAULT '';

-- Drop default to avoid automatic empty strings on future inserts
ALTER TABLE "CandidateScore" ALTER COLUMN "riskReason" DROP DEFAULT;
