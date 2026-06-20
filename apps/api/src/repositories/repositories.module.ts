import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { GitHubRepositoryProvider } from "./provider.port";
import { RepositoriesService } from "./repositories.service";
import { RepositoriesController } from "./repositories.controller";

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [
    RepositoriesService,
    { provide: "REPOSITORY_PROVIDER", useClass: GitHubRepositoryProvider },
  ],
  controllers: [RepositoriesController],
})
export class RepositoriesModule {}
