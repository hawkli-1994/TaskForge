import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class OutboxService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("runner.dispatch") private readonly runnerQueue: Queue,
  ) {}

  async enqueue(type: string, payload: Record<string, unknown>) {
    return this.prisma.outboxEvent.create({
      data: {
        type,
        payload: payload as Prisma.InputJsonValue,
        status: "pending",
      },
    });
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
    const prompt = this.renderPrompt(
      latestPrompt?.template ?? "",
      session.workItem,
      bundle,
    );

    const nextStatus = session.runnerId ? "dispatching" : "queued";
    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        status: nextStatus,
        acpAgentInfoJson: { prompt } as Prisma.InputJsonValue,
      },
    });

    await this.runnerQueue.add("dispatch", { sessionId });
  }

  private renderPrompt(
    template: string,
    workItem: { title: string; description: string | null; acceptanceCriteria: string | null },
    bundle?: {
      summary: string | null;
      goal: string | null;
      acceptanceCriteria: string | null;
    } | null,
  ) {
    return template
      .replace(/{{title}}/g, workItem.title)
      .replace(/{{description}}/g, workItem.description ?? "")
      .replace(/{{acceptanceCriteria}}/g, workItem.acceptanceCriteria ?? "")
      .replace(/{{summary}}/g, bundle?.summary ?? workItem.title)
      .replace(/{{goal}}/g, bundle?.goal ?? workItem.description ?? "");
  }
}
