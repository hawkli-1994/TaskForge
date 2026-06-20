import { PrismaClient } from "@taskforge/db";
import { Worker, Job, UnrecoverableError } from "bullmq";
import type { RedisOptions } from "ioredis";
import { DISPATCH_QUEUE } from "../queue-names";
import { createRedisConnection } from "../redis";

export function createDispatchProcessor(
  prisma: PrismaClient,
  redis?: RedisOptions,
): Worker {
  return new Worker(
    DISPATCH_QUEUE,
    async (job: Job<{ sessionId: string }>) => {
      const { sessionId } = job.data;
      console.log(`[runner.dispatch] processing session ${sessionId}`);

      const session = await prisma.agentSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        throw new UnrecoverableError(`AgentSession ${sessionId} not found`);
      }

      if (!session.runnerId) {
        await prisma.agentSession.update({
          where: { id: sessionId },
          data: { status: "dispatching" },
        });
      }
    },
    { connection: redis ?? createRedisConnection() },
  );
}
