export interface CreatePullRequestInput {
  owner?: string;
  repo?: string;
  projectPath?: string;
  title: string;
  body: string;
  headBranch: string;
  baseBranch: string;
}

export interface PullRequestRef {
  number: number;
  externalId: string;
  title: string;
  url: string;
  state: string;
  headBranch: string;
  baseBranch: string;
}

export interface RepositoryProviderAuth {
  token: string;
  baseUrl?: string;
}

export interface PullRequestProvider {
  createPullRequest(
    auth: RepositoryProviderAuth,
    input: CreatePullRequestInput,
  ): Promise<PullRequestRef>;
}

export class GitHubPullRequestProvider implements PullRequestProvider {
  async createPullRequest(
    auth: RepositoryProviderAuth,
    input: CreatePullRequestInput,
  ): Promise<PullRequestRef> {
    const response = await fetch(
      `https://api.github.com/repos/${input.owner}/${input.repo}/pulls`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${auth.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: input.title,
          body: input.body,
          head: input.headBranch,
          base: input.baseBranch,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText} - ${body}`,
      );
    }

    const data = (await response.json()) as {
      number: number;
      id: number;
      title: string;
      html_url: string;
      state: string;
      head: { ref: string };
      base: { ref: string };
    };

    return {
      number: data.number,
      externalId: String(data.id),
      title: data.title,
      url: data.html_url,
      state: data.state,
      headBranch: data.head.ref,
      baseBranch: data.base.ref,
    };
  }
}

export class GitLabPullRequestProvider implements PullRequestProvider {
  async createPullRequest(
    auth: RepositoryProviderAuth,
    input: CreatePullRequestInput,
  ): Promise<PullRequestRef> {
    const projectPath = input.projectPath;
    if (!projectPath) {
      throw new Error("GitLab createPullRequest requires projectPath");
    }
    const baseUrl = auth.baseUrl ?? "https://gitlab.com";
    const encodedPath = encodeURIComponent(projectPath);
    const response = await fetch(
      `${baseUrl}/api/v4/projects/${encodedPath}/merge_requests`,
      {
        method: "POST",
        headers: {
          "PRIVATE-TOKEN": auth.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_branch: input.headBranch,
          target_branch: input.baseBranch,
          title: input.title,
          description: input.body,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `GitLab API error: ${response.status} ${response.statusText} - ${body}`,
      );
    }

    const data = (await response.json()) as {
      iid: number;
      id: number;
      title: string;
      web_url: string;
      state: string;
      source_branch: string;
      target_branch: string;
    };

    return {
      number: data.iid,
      externalId: String(data.id),
      title: data.title,
      url: data.web_url,
      state: data.state,
      headBranch: data.source_branch,
      baseBranch: data.target_branch,
    };
  }
}

export function parseGitHubOwnerRepo(url: string): {
  owner: string;
  repo: string;
} {
  const cleaned = url.trim();
  if (cleaned.startsWith("git@github.com:")) {
    const rest = cleaned.replace("git@github.com:", "").replace(/\.git$/, "");
    const parts = rest.split("/");
    if (parts.length < 2) {
      throw new Error(`Invalid GitHub SSH URL: ${url}`);
    }
    return { owner: parts[0], repo: parts.slice(1).join("/") };
  }
  try {
    const parsed = new URL(cleaned);
    const parts = parsed.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    if (parts.length < 2) {
      throw new Error(`Invalid GitHub HTTPS URL: ${url}`);
    }
    return { owner: parts[0], repo: parts.slice(1).join("/") };
  } catch {
    throw new Error(`Invalid GitHub repository URL: ${url}`);
  }
}

export function parseGitLabProjectPath(url: string): string {
  const cleaned = url.trim();
  if (cleaned.startsWith("git@")) {
    const colonIndex = cleaned.indexOf(":");
    const rest = cleaned.slice(colonIndex + 1).replace(/\.git$/, "");
    const parts = rest.split("/");
    if (parts.length < 2) {
      throw new Error(`Invalid GitLab SSH URL: ${url}`);
    }
    return rest;
  }
  try {
    const parsed = new URL(cleaned);
    const path = parsed.pathname.replace(/^\//, "").replace(/\.git$/, "").replace(/\/$/, "");
    if (!path.includes("/")) {
      throw new Error(`Invalid GitLab HTTPS URL: ${url}`);
    }
    return path;
  } catch {
    throw new Error(`Invalid GitLab repository URL: ${url}`);
  }
}
