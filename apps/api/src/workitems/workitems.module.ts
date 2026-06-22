import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { ProjectsModule } from "../projects/projects.module";
import { WorkItemsService } from "./workitems.service";
import { WorkItemsController } from "./workitems.controller";

@Module({
  imports: [PrismaModule, AuditModule, ProjectsModule],
  providers: [WorkItemsService],
  controllers: [WorkItemsController],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
