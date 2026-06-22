import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  CreateTeamInput,
  AddTeamMemberInput,
  UpdateTeamMemberRoleInput,
} from "@taskforge/contracts";
import { ZodBody } from "../common/zod.pipe";
import { ReqUser, RequestUser } from "../auth/req-user.decorator";
import { TeamsService } from "./teams.service";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  create(
    @ZodBody(CreateTeamInput) input: CreateTeamInput,
    @ReqUser() user: RequestUser,
  ) {
    return this.teams.create(input, user.id);
  }

  @Get()
  findAll(@ReqUser() user: RequestUser) {
    return this.teams.findAll(user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.teams.findOne(id, user.id);
  }

  @Post(":id/members")
  addMember(
    @Param("id") id: string,
    @ZodBody(AddTeamMemberInput) input: AddTeamMemberInput,
    @ReqUser() user: RequestUser,
  ) {
    return this.teams.addMember(id, input, user.id);
  }

  @Patch(":id/members/:userId/role")
  updateMemberRole(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @ZodBody(UpdateTeamMemberRoleInput) input: UpdateTeamMemberRoleInput,
    @ReqUser() user: RequestUser,
  ) {
    return this.teams.updateMemberRole(id, userId, input, user.id);
  }

  @Delete(":id/members/:userId")
  removeMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @ReqUser() user: RequestUser,
  ) {
    return this.teams.removeMember(id, userId, user.id);
  }
}
