-- AlterTable: Add inviteToken to Player
ALTER TABLE "Player" ADD COLUMN "inviteToken" TEXT;

-- Backfill existing players with unique tokens (using their id as a fallback)
UPDATE "Player" SET "inviteToken" = "id" WHERE "inviteToken" IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE "Player" ALTER COLUMN "inviteToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Player_inviteToken_key" ON "Player"("inviteToken");
