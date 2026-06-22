import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateUserInput } from "@taskforge/contracts";
import { ZodBody } from "../common/zod.pipe";
import { ReqUser, RequestUser } from "../auth/req-user.decorator";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@ZodBody(CreateUserInput) input: CreateUserInput) {
    return this.users.create(input);
  }

  @Get("me")
  me(@ReqUser() user: RequestUser) {
    return this.users.findOne(user.id);
  }
}
