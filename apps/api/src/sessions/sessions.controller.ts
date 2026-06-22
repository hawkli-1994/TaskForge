import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import {
  CreateSessionInput,
  HumanInputEventInput,
  type SessionStatus,
} from "@taskforge/contracts";
import { ZodBody } from "../common/zod.pipe";
import { ReqUser, RequestUser } from "../auth/req-user.decorator";
import { SessionsService } from "./sessions.service";

@Controller("sessions")
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  create(
    @ZodBody(CreateSessionInput) input: CreateSessionInput,
    @ReqUser() user: RequestUser,
  ) {
    return this.sessions.create(input, user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.sessions.findOne(id, user.id);
  }

  @Get(":id/events")
  findEvents(
    @Param("id") id: string,
    @ReqUser() user: RequestUser,
    @Query("afterSeq") afterSeq?: string,
  ) {
    return this.sessions.findEvents(
      id,
      user.id,
      afterSeq === undefined ? undefined : Number(afterSeq),
    );
  }

  @Get(":id/events/stream")
  async stream(
    @Param("id") id: string,
    @Query("afterSeq") afterSeq: string | undefined,
    @Res() res: Response,
    @ReqUser() user: RequestUser,
  ) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write("retry: 500\n\n");

    let lastSeq = afterSeq ? Number(afterSeq) : 0;
    while (!res.destroyed) {
      const events = await this.sessions.findEvents(
        id,
        user.id,
        lastSeq || undefined,
      );
      for (const event of events) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.seq > lastSeq) {
          lastSeq = event.seq;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  @Post(":id/events")
  appendHumanInput(
    @Param("id") id: string,
    @ZodBody(HumanInputEventInput) input: HumanInputEventInput,
    @ReqUser() user: RequestUser,
  ) {
    return this.sessions.appendHumanInput(id, input, user.id);
  }

  @Post(":id/stop")
  @HttpCode(HttpStatus.OK)
  stop(
    @Param("id") id: string,
    @Body() input: { reason?: string; finalStatus?: SessionStatus },
    @ReqUser() user: RequestUser,
  ) {
    return this.sessions.stop(id, input, user.id);
  }
}
