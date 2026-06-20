import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CreateProjectInput } from "@taskforge/contracts";
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
  findAll() {
    return this.projects.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.projects.findOne(id);
  }

  @Get(":id/board")
  board(
    @Param("id") id: string,
    @Query("status") status?: string,
    @Query("assignee") assignee?: string,
  ) {
    return this.projects.board(id, { status, assignee });
  }
}
