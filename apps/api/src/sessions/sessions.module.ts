import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { OutboxModule } from "../outbox/outbox.module";
import { ProjectsModule } from "../projects/projects.module";
import { SessionsService } from "./sessions.service";
import { SessionsController } from "./sessions.controller";

@Module({
  imports: [PrismaModule, AuditModule, OutboxModule, ProjectsModule],
  providers: [SessionsService],
  controllers: [SessionsController],
})
export class SessionsModule {}
