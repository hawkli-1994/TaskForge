import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma.module";
import { ArtifactsService } from "./artifacts.service";
import { ArtifactsController } from "./artifacts.controller";

@Module({
  imports: [PrismaModule],
  providers: [ArtifactsService],
  controllers: [ArtifactsController],
})
export class ArtifactsModule {}
