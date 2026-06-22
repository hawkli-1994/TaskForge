import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateTeamInput,
  AddTeamMemberInput,
  UpdateTeamMemberRoleInput,
  type TeamRole,
} from "@taskforge/contracts";
import { hasTeamAccess } from "@taskforge/domain";
import { PrismaService } from "../common/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateTeamInput, actorId: string) {
    const team = await this.prisma.team.create({
      data: {
        name: input.name,
        ownerId: actorId,
        members: {
          create: { userId: actorId, role: "owner" },
        },
      },
    });
    await this.audit.log("team.created", actorId, "team", team.id, {
      name: input.name,
    });
    return team;
  }

  async findAll(actorId: string) {
    return this.prisma.team.findMany({
      where: {
        OR: [{ ownerId: actorId }, { members: { some: { userId: actorId } } }],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, actorId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    await this.assertTeamAccess(actorId, id, "member");
    return team;
  }

  async addMember(
    teamId: string,
    input: AddTeamMemberInput,
    actorId: string,
  ) {
    await this.assertTeamAccess(actorId, teamId, "admin");

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: input.userId } },
    });
    if (existing) {
      throw new BadRequestException("User is already a team member");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const member = await this.prisma.teamMember.create({
      data: { teamId, userId: input.userId, role: input.role },
    });
    await this.audit.log("team.member_added", actorId, "team", teamId, {
      userId: input.userId,
      role: input.role,
    });
    return member;
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    input: UpdateTeamMemberRoleInput,
    actorId: string,
  ) {
    const actorMember = await this.getMemberOrThrow(teamId, actorId);
    if (!hasTeamAccess(actorMember.role as TeamRole, "admin")) {
      throw new ForbiddenException("Insufficient team permissions");
    }

    const targetMember = await this.getMemberOrThrow(teamId, userId);
    if (targetMember.role === "owner" && actorMember.role !== "owner") {
      throw new ForbiddenException("Only the team owner can change the owner");
    }
    if (input.role === "owner" && actorMember.role !== "owner") {
      throw new ForbiddenException("Only the team owner can assign owner");
    }

    const updated = await this.prisma.teamMember.update({
      where: { id: targetMember.id },
      data: { role: input.role },
    });
    await this.audit.log("team.member_role_changed", actorId, "team", teamId, {
      userId,
      role: input.role,
    });
    return updated;
  }

  async removeMember(teamId: string, userId: string, actorId: string) {
    const actorMember = await this.getMemberOrThrow(teamId, actorId);
    if (!hasTeamAccess(actorMember.role as TeamRole, "admin")) {
      throw new ForbiddenException("Insufficient team permissions");
    }

    const targetMember = await this.getMemberOrThrow(teamId, userId);
    if (targetMember.role === "owner") {
      throw new ForbiddenException("Cannot remove the team owner");
    }

    await this.prisma.teamMember.delete({ where: { id: targetMember.id } });
    await this.audit.log("team.member_removed", actorId, "team", teamId, {
      userId,
    });
  }

  private async assertTeamAccess(
    actorId: string,
    teamId: string,
    requiredRole: TeamRole,
  ) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: actorId } },
    });
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true },
    });
    const role = member?.role ?? (team?.ownerId === actorId ? "owner" : undefined);
    if (!role || !hasTeamAccess(role as TeamRole, requiredRole)) {
      throw new ForbiddenException("Insufficient team permissions");
    }
  }

  private async getMemberOrThrow(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member) {
      throw new NotFoundException("Team member not found");
    }
    return member;
  }
}
