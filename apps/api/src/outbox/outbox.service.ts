import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Prisma } from "@prisma/client";
import {
  loadPiAgentConfigFromEnv,
  resolvePullRequestForSession,
} from "@taskforge/pi-agent";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";
import { renderPrompt } from "../common/prompt.util";

@Injectable()
export class OutboxService {
  private readonly CLAIM_AVAILABLE_KEY = "runner:claims:available";

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional()
    @InjectQueue("outbox")
    private readonly outboxQueue: Queue | undefined,
    @Optional()
    @InjectQueue("runner.dispatch")
    private readonly runnerQueue: Queue | undefined,
    @Optional()
    @InjectQueue("pi.pr")
    private readonly piPrQueue: Queue | undefined,
  ) {}

  async enqueue(type: string, payload: Record<string, unknown>) {
    const event = await this.prisma.outboxEvent.create({
      data: {
        type,
        payload: payload as Prisma.InputJsonValue,
        status: "pending",
      },
    });

    await this.enqueueJob(event.id);
    return event;
  }

  async enqueueJob(eventId: string): Promise<boolean> {
    if (this.outboxQueue) {
      await this.outboxQueue.add("process", { eventId });
      return true;
    }
    return false;
  }

  async enqueueResolvePr(sessionId: string) {
    if (this.piPrQueue) {
      await this.piPrQueue.add("process", { sessionId });
      return;
    }

    // BullMQ disabled; run PR resolution synchronously so dev/E2E still works.
    await this.processResolvePr(sessionId);
  }

  async processResolvePr(sessionId: string) {
    const config = loadPiAgentConfigFromEnv();
    await resolvePullRequestForSession(this.prisma, config, sessionId);
  }

  async processPrepareAcpPrompt(sessionId: string) {
    const session = await this.prisma.agentSession.findUnique({
      where: { id: sessionId },
      include: {
        contextBundle: true,
        workItem: {
          include: {
            project: true,
            contextBundles: { orderBy: { version: "desc" }, take: 1 },
          },
        },
        runner: true,
      },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const latestPrompt = await this.prisma.promptVersion.findFirst({
      where: { mode: session.mode },
      orderBy: { version: "desc" },
    });

    const bundle =
      session.contextBundle || session.workItem.contextBundles[0] || null;
    const prompt = renderPrompt(
      latestPrompt?.template ?? "",
      session.workItem,
      bundle,
    );

    const existingInfo = (session.acpAgentInfoJson ?? {}) as Record<
      string,
      unknown
    >;
    const acpAgentInfoJson = {
      ...existingInfo,
      prompt,
    };

    const nextStatus = session.runnerId ? "dispatching" : "queued";
    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        status: nextStatus,
        acpAgentInfoJson: acpAgentInfoJson as Prisma.InputJsonValue,
      },
    });

    await this.redis.getClient().set(this.CLAIM_AVAILABLE_KEY, "1");

    if (this.runnerQueue) {
      await this.runnerQueue.add("dispatch", { sessionId });
    } else if (nextStatus === "dispatching") {
      // In dev mode without BullMQ, rely on Runner polling claim endpoint.
      // Status is already set to dispatching, so synchronous enqueue is not needed.
    }
  }
}

