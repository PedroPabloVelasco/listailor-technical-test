-- Create magic link ticket storage
CREATE TABLE IF NOT EXISTS "MagicLinkTicket" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "MagicLinkTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MagicLinkTicket_tokenHash_key" ON "MagicLinkTicket" ("tokenHash");
CREATE INDEX IF NOT EXISTS "MagicLinkTicket_email_idx" ON "MagicLinkTicket" ("email");
CREATE INDEX IF NOT EXISTS "MagicLinkTicket_expiresAt_idx" ON "MagicLinkTicket" ("expiresAt");

-- Track email owning each session
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "email" TEXT;
UPDATE "Session" SET "email" = COALESCE("email", 'dev@listailor.io');
ALTER TABLE "Session" ALTER COLUMN "email" SET NOT NULL;
