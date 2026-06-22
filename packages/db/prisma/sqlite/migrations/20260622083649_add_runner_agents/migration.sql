-- CreateTable
CREATE TABLE "RunnerAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adapter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'online',
    "lastHeartbeatAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RunnerAgent_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "RunnerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RunnerAgent_runnerId_idx" ON "RunnerAgent"("runnerId");

-- CreateIndex
CREATE UNIQUE INDEX "RunnerAgent_runnerId_name_key" ON "RunnerAgent"("runnerId", "name");
