-- CreateTable
CREATE TABLE "CandidateScore" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "relevanceScore" INTEGER NOT NULL,
    "relevanceReason" TEXT NOT NULL,
    "experienceScore" INTEGER NOT NULL,
    "experienceReason" TEXT NOT NULL,
    "motivationScore" INTEGER NOT NULL,
    "motivationReason" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskFlags" JSONB NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateScore_candidateId_key" ON "CandidateScore"("candidateId");

-- AddForeignKey
ALTER TABLE "CandidateScore" ADD CONSTRAINT "CandidateScore_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
