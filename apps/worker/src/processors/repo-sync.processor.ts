import { Worker, Job } from "bullmq";
import type { RedisOptions } from "ioredis";
import { REPO_SYNC_QUEUE } from "../queue-names";
import { createRedisConnection } from "../redis";

export function createRepoSyncProcessor(redis?: RedisOptions): Worker {
  return new Worker(
    REPO_SYNC_QUEUE,
    async (job: Job) => {
      console.log(`[repo.sync] received job ${job.id}`, job.data);
    },
    { connection: redis ?? createRedisConnection() },
  );
}
