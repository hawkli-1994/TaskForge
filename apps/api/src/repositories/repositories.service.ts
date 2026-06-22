import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { RepositoryProviderInput } from "@taskforge/contracts";
import { PrismaService } from "../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ProjectsService } from "../projects/projects.service";
import { REPOSITORY_PROVIDERS } from "./repositories.constants";
import type { RepositoryProviderMap } from "./repositories.module";

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly projects: ProjectsService,
    @Inject(REPOSITORY_PROVIDERS)
    private readonly providers: RepositoryProviderMap,
  ) {}

  async create(
    projectId: string,
    input: RepositoryProviderInput,
    actorId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    await this.projects.requireAccess(actorId, projectId, "maintainer");

    const provider = this.providers[input.provider];
    if (!provider) {
      throw new NotFoundException(
        `Repository provider "${input.provider}" is not configured`,
      );
    }

    const metadata = await provider.fetchMetadata(input);
    const repository = await this.prisma.repository.create({
      data: {
        projectId,
        provider: input.provider,
        url: input.url,
        defaultBranch: input.defaultBranch ?? metadata.defaultBranch ?? null,
        externalId: input.externalId ?? metadata.externalId ?? null,
      },
    });

    await this.audit.log(
      "repository.created",
      actorId,
      "repository",
      repository.id,
      { provider: input.provider, url: input.url },
    );
    return repository;
  }
}
