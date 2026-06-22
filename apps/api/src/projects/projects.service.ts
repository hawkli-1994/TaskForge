import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateProjectInput,
  AddProjectMemberInput,
  UpdateProjectMemberRoleInput,
  type ProjectRole,
  type TeamRole,
} from "@taskforge/contracts";
import { WORK_ITEM_STATUSES } from "@taskforge/domain";
import { hasProjectAccess, hasTeamAccess } from "@taskforge/domain";
import { PrismaService } from "../common/prisma.service";
import { AuditService } from "../audit/audit.service";

const TEAM_TO_PROJECT_ROLE: Record<TeamRole, ProjectRole> = {
  owner: "owner",
  admin: "maintainer",
  member: "viewer",
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateProjectInput, actorId: string) {
    if (input.teamId) {
      await this.assertCanCreateTeamProject(actorId, input.teamId);
    }

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: input.name,
          description: input.description,
          createdBy: actorId,
          teamId: input.teamId ?? null,
        },
      });

      if (input.teamId) {
        const teamMembers = await tx.teamMember.findMany({
          where: { teamId: input.teamId },
          include: { user: true },
        });
        for (const member of teamMembers) {
          const role =
            member.userId === actorId
              ? "owner"
              : TEAM_TO_PROJECT_ROLE[member.role as TeamRole];
          await tx.projectMember.create({
            data: { projectId: created.id, userId: member.userId, role },
          });
        }
      } else {
        await tx.projectMember.create({
          data: { projectId: created.id, userId: actorId, role: "owner" },
        });
      }

      return created;
    });

    await this.audit.log("project.created", actorId, "project", project.id, {
      name: input.name,
      teamId: input.teamId,
    });
    return project;
  }

  async findAll(actorId: string) {
    return this.prisma.project.findMany({
      where: {
        members: { some: { userId: actorId } },
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { workItems: true, repositories: true, requirements: true, findings: true },
        },
      },
    });
  }

  async findOne(id: string, actorId: string) {
    await this.requireAccess(actorId, id, "viewer");
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: { workItems: true, repositories: true, requirements: true, findings: true },
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
    actorId: string,
    filters: { status?: string; assignee?: string },
  ) {
    await this.requireAccess(actorId, id, "viewer");
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, description: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    const items = await this.prisma.workItem.findMany({
      where: {
        projectId: id,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.assignee ? { assigneeId: filters.assignee } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    return { project, items };
  }

  async findMembers(id: string, actorId: string) {
    await this.requireAccess(actorId, id, "viewer");
    return this.prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async addMember(
    projectId: string,
    input: AddProjectMemberInput,
    actorId: string,
  ) {
    await this.requireAccess(actorId, projectId, "owner");

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: input.userId } },
    });
    if (existing) {
      throw new BadRequestException("User is already a project member");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const member = await this.prisma.projectMember.create({
      data: { projectId, userId: input.userId, role: input.role },
    });
    await this.audit.log(
      "project.member_added",
      actorId,
      "project",
      projectId,
      { userId: input.userId, role: input.role },
    );
    return member;
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    input: UpdateProjectMemberRoleInput,
    actorId: string,
  ) {
    await this.requireAccess(actorId, projectId, "owner");

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) {
      throw new NotFoundException("Project member not found");
    }

    const updated = await this.prisma.projectMember.update({
      where: { id: member.id },
      data: { role: input.role },
    });
    await this.audit.log(
      "project.member_role_changed",
      actorId,
      "project",
      projectId,
      { userId, role: input.role },
    );
    return updated;
  }

  async removeMember(projectId: string, userId: string, actorId: string) {
    await this.requireAccess(actorId, projectId, "owner");

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) {
      throw new NotFoundException("Project member not found");
    }
    if (member.role === "owner") {
      throw new BadRequestException("Cannot remove the project owner");
    }

    await this.prisma.projectMember.delete({ where: { id: member.id } });
    await this.audit.log(
      "project.member_removed",
      actorId,
      "project",
      projectId,
      { userId },
    );
  }

  async requireAccess(
    actorId: string,
    projectId: string,
    requiredRole: ProjectRole,
  ) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actorId } },
    });
    if (!member || !hasProjectAccess(member.role as ProjectRole, requiredRole)) {
      throw new ForbiddenException("Insufficient project permissions");
    }
    return member;
  }

  private async assertCanCreateTeamProject(actorId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { where: { userId: actorId } } },
    });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    const role =
      team.ownerId === actorId
        ? "owner"
        : (team.members[0]?.role as TeamRole | undefined);
    if (!role || !hasTeamAccess(role, "admin")) {
      throw new ForbiddenException(
        "Only team owners or admins can create team projects",
      );
    }
  }
}
