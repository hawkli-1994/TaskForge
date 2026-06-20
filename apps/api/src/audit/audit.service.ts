import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    action: string,
    actorId: string | null | undefined,
    targetType: string,
    targetId: string,
    payload?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        action,
        actorId: actorId ?? null,
        targetType,
        targetId,
        payload: (payload ?? null) as any,
      },
    });
  }
}
