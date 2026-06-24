import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { ProjectsModule } from "../projects/projects.module";
import { GitHubRepositoryProvider, RepositoryProvider } from "./provider.port";
import { GitLabRepositoryProvider } from "./gitlab.provider";
import { RepositoriesService } from "./repositories.service";
import { RepositoriesController } from "./repositories.controller";
import { REPOSITORY_PROVIDERS } from "./repositories.constants";

export type RepositoryProviderMap = Record<string, RepositoryProvider>;

@Module({
  imports: [PrismaModule, AuditModule, ProjectsModule],
  providers: [
    RepositoriesService,
    {
      provide: REPOSITORY_PROVIDERS,
      useFactory: (): RepositoryProviderMap => ({
        github: new GitHubRepositoryProvider(),
        gitlab: new GitLabRepositoryProvider(),
      }),
    },
  ],
  controllers: [RepositoriesController],
})
export class RepositoriesModule {}
