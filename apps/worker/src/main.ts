import { PrismaClient } from "@taskforge/db";
import { createOutboxProcessor } from "./processors/outbox.processor";
import { createDispatchProcessor } from "./processors/dispatch.processor";
import { createRepoSyncProcessor } from "./processors/repo-sync.processor";
import { createPiPrProcessor } from "./processors/pi-pr.processor";
import { createRedisConnection } from "./redis";

async function bootstrap(): Promise<void> {
  const prisma = new PrismaClient();
  const redisOptions = createRedisConnection();

  const workers = [
    createOutboxProcessor(prisma, redisOptions),
    createDispatchProcessor(prisma, redisOptions),
    createRepoSyncProcessor(redisOptions),
    createPiPrProcessor(prisma, redisOptions),
  ];

  console.log("TaskForge worker started");

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    await Promise.all(workers.map((worker) => worker.close()));
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
