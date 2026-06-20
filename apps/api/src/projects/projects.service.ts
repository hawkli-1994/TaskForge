import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateProjectInput } from "@taskforge/contracts";
import { WORK_ITEM_STATUSES } from "@taskforge/domain";
import { PrismaService } from "../common/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateProjectInput, actorId: string) {
    const project = await this.prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        createdBy: actorId,
      },
    });
    await this.audit.log("project.created", actorId, "project", project.id, {
      name: input.name,
    });
    return project;
  }

  async findAll() {
    return this.prisma.project.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            workItems: true,
            repositories: true,
            requirements: true,
            findings: true,
          },
        },
      },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }

  async board(
    id: string,
    filters: { status?: string; assignee?: string },
  ) {
    const items = await this.prisma.workItem.findMany({
      where: {
        projectId: id,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.assignee ? { assigneeId: filters.assignee } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    const grouped: Record<string, typeof items> = {};
    for (const status of WORK_ITEM_STATUSES) {
      grouped[status] = [];
    }
    for (const item of items) {
      grouped[item.status] = (grouped[item.status] ?? []).concat(item);
    }
    return grouped;
  }
}
