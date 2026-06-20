import { Injectable } from "@nestjs/common";
import { RepositoryProviderInput } from "@taskforge/contracts";

export interface RepositoryProvider {
  fetchMetadata(input: RepositoryProviderInput): Promise<{
    defaultBranch?: string;
    externalId?: string;
  }>;
}

@Injectable()
export class GitHubRepositoryProvider implements RepositoryProvider {
  async fetchMetadata(input: RepositoryProviderInput) {
    return {
      defaultBranch: "main",
      externalId: input.externalId ?? "github-stub",
    };
  }
}
