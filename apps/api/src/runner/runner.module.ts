import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { RunnerService } from "./runner.service";
import { RunnerController } from "./runner.controller";

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [RunnerService],
  controllers: [RunnerController],
})
export class RunnerModule {}
