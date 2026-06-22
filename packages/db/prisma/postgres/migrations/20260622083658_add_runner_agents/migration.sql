-- CreateTable
CREATE TABLE "RunnerAgent" (
    "id" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adapter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'online',
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunnerAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunnerAgent_runnerId_idx" ON "RunnerAgent"("runnerId");

-- CreateIndex
CREATE UNIQUE INDEX "RunnerAgent_runnerId_name_key" ON "RunnerAgent"("runnerId", "name");

-- AddForeignKey
ALTER TABLE "RunnerAgent" ADD CONSTRAINT "RunnerAgent_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "RunnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
