ALTER TABLE "RunnerProfile" ADD COLUMN "token" TEXT;
CREATE UNIQUE INDEX "RunnerProfile_token_key" ON "RunnerProfile"("token");
