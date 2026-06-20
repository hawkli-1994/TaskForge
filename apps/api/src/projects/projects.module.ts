import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [ProjectsService],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
