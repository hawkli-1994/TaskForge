import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  CreateProjectInput,
  AddProjectMemberInput,
  UpdateProjectMemberRoleInput,
} from "@taskforge/contracts";
import { ZodBody } from "../common/zod.pipe";
import { ReqUser, RequestUser } from "../auth/req-user.decorator";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  create(
    @ZodBody(CreateProjectInput) input: CreateProjectInput,
    @ReqUser() user: RequestUser,
  ) {
    return this.projects.create(input, user.id);
  }

  @Get()
  findAll(@ReqUser() user: RequestUser) {
    return this.projects.findAll(user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.projects.findOne(id, user.id);
  }

  @Get(":id/board")
  board(
    @Param("id") id: string,
    @Query("status") status?: string,
    @Query("assignee") assignee?: string,
    @ReqUser() user?: RequestUser,
  ) {
    return this.projects.board(id, user!.id, { status, assignee });
  }

  @Get(":id/members")
  findMembers(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.projects.findMembers(id, user.id);
  }

  @Post(":id/members")
  addMember(
    @Param("id") id: string,
    @ZodBody(AddProjectMemberInput) input: AddProjectMemberInput,
    @ReqUser() user: RequestUser,
  ) {
    return this.projects.addMember(id, input, user.id);
  }

  @Patch(":id/members/:userId/role")
  updateMemberRole(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @ZodBody(UpdateProjectMemberRoleInput) input: UpdateProjectMemberRoleInput,
    @ReqUser() user: RequestUser,
  ) {
    return this.projects.updateMemberRole(id, userId, input, user.id);
  }

  @Delete(":id/members/:userId")
  removeMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @ReqUser() user: RequestUser,
  ) {
    return this.projects.removeMember(id, userId, user.id);
  }
}
