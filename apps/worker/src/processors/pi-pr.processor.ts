import { PrismaClient } from "@taskforge/db";
import { Worker, Job, UnrecoverableError } from "bullmq";
import type { RedisOptions } from "ioredis";
import {
  loadPiAgentConfigFromEnv,
  resolvePullRequestForSession,
} from "@taskforge/pi-agent";
import { PI_PR_QUEUE } from "../queue-names";
import { createRedisConnection } from "../redis";

export function createPiPrProcessor(
  prisma: PrismaClient,
  redis?: RedisOptions,
): Worker {
  const config = loadPiAgentConfigFromEnv();

  return new Worker(
    PI_PR_QUEUE,
    async (job: Job<{ sessionId: string }>) => {
      const { sessionId } = job.data;
      console.log(`[pi.pr] processing session ${sessionId}`);

      const session = await prisma.agentSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        throw new UnrecoverableError(`AgentSession ${sessionId} not found`);
      }

      const result = await resolvePullRequestForSession(prisma, config, sessionId);
      console.log(`[pi.pr] result for ${sessionId}:`, result);
      return result;
    },
    { connection: redis ?? createRedisConnection() },
  );
}
