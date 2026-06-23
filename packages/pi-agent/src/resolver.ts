import type { PrismaClient } from "@taskforge/db";
import type { LlmClient } from "./llm";
import { detectPrFromEvents } from "./parser";
import {
  GitHubPullRequestProvider,
  GitLabPullRequestProvider,
  parseGitHubOwnerRepo,
  parseGitLabProjectPath,
  type CreatePullRequestInput,
  type PullRequestRef,
  type RepositoryProviderAuth,
} from "./providers";

export interface PiAgentConfig {
  llm?: {
    client: LlmClient;
  };
  github?: {
    token: string;
  };
  gitlab?: {
    token: string;
    baseUrl?: string;
  };
}

export async function resolvePullRequestForSession(
  prisma: PrismaClient,
  config: PiAgentConfig,
  sessionId: string,
): Promise<{ created: boolean; pullRequestId?: string }> {
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    include: {
      workItem: {
        include: {
          repository: true,
          project: { include: { repositories: true } },
        },
      },
      runner: { include: { bindings: { include: { repository: true } } } },
      events: { orderBy: { seq: "asc" } },
    },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Resolve repository: work item → runner binding → project fallback.
  const repository =
    session.workItem.repository ??
    session.runner?.bindings[0]?.repository ??
    session.workItem.project.repositories[0] ??
    null;
  if (!repository) {
    console.log(
      `[pi-agent] No repository linked to work item ${session.workItem.id}, its runner, or its project; skipping PR resolution`,
    );
    return { created: false };
  }

  const auth = buildProviderAuth(repository.provider, repository.accessToken, config);
  if (!auth.token) {
    console.log(
      `[pi-agent] No access token available for repository ${repository.id}; skipping PR resolution`,
    );
    return { created: false };
  }

  // Build transcript from relevant agent events.
  const transcript = buildTranscript(session.events);

  let detected = {
    createdPr: false,
    prUrl: null as string | null,
    prNumber: null as number | null,
    headBranch: null as string | null,
    baseBranch: null as string | null,
    commitSha: null as string | null,
  };

  if (config.llm && transcript.length > 0) {
    try {
      const result = await detectPrFromEvents(config.llm.client, transcript);
      detected = {
        createdPr: result.createdPr,
        prUrl: result.prUrl ?? null,
        prNumber: result.prNumber ?? null,
        headBranch: result.headBranch ?? null,
        baseBranch: result.baseBranch ?? null,
        commitSha: result.commitSha ?? null,
      };
      console.log(`[pi-agent] LLM detection:`, detected);
    } catch (err) {
      console.error(`[pi-agent] LLM detection failed:`, err);
    }
  }

  // If the agent already created a PR, record it and stop.
  if (detected.createdPr && detected.prUrl && detected.headBranch) {
    const pr = await prisma.pullRequest.create({
      data: {
        workItemId: session.workItemId,
        sessionId: session.id,
        repositoryId: repository.id,
        provider: repository.provider,
        number: detected.prNumber ?? undefined,
        externalId: null,
        title: `TaskForge: ${session.workItem.title}`,
        headBranch: detected.headBranch,
        baseBranch: detected.baseBranch ?? repository.defaultBranch ?? "main",
        url: detected.prUrl,
        commitSha: detected.commitSha,
        state: "open",
        createdBy: "local-agent",
      },
    });
    return { created: true, pullRequestId: pr.id };
  }

  // Otherwise, try to discover an existing PR for the branch the agent likely
  // pushed. This works even when no LLM is configured.
  const headBranch =
    detected.headBranch ?? `taskforge/${session.workItem.id}`;
  const baseBranch =
    detected.baseBranch ?? repository.defaultBranch ?? "main";

  const existing = await prisma.pullRequest.findFirst({
    where: { workItemId: session.workItemId, headBranch },
  });
  if (existing) {
    console.log(`[pi-agent] PR already exists for branch ${headBranch}`);
    return { created: false, pullRequestId: existing.id };
  }

  let prRef: PullRequestRef | undefined;
  try {
    prRef =
      (await findProviderPullRequestByBranch(auth, repository.provider, repository.url, {
        headBranch,
        baseBranch,
      })) ?? undefined;
  } catch (err) {
    console.error(`[pi-agent] Failed to find existing PR:`, err);
  }

  // If we can't find an existing PR, try to create one ourselves.
  if (!prRef) {
    try {
      prRef = await createProviderPullRequest(auth, repository.provider, repository.url, {
        title: `TaskForge: ${session.workItem.title}`,
        body: buildPrBody(session.workItemId, session.id),
        headBranch,
        baseBranch,
      });
    } catch (err) {
      console.error(`[pi-agent] Failed to create PR:`, err);
      return { created: false };
    }
  }

  const pr = await prisma.pullRequest.create({
    data: {
      workItemId: session.workItemId,
      sessionId: session.id,
      repositoryId: repository.id,
      provider: repository.provider,
      number: prRef.number,
      externalId: prRef.externalId,
      title: prRef.title,
      headBranch: prRef.headBranch,
      baseBranch: prRef.baseBranch,
      url: prRef.url,
      commitSha: detected.commitSha,
      state: prRef.state,
      createdBy: "pi-agent",
    },
  });

  return { created: true, pullRequestId: pr.id };
}

interface CreatePrArgs {
  title: string;
  body: string;
  headBranch: string;
  baseBranch: string;
}

function buildProviderAuth(
  provider: string,
  repositoryToken: string | null | undefined,
  config: PiAgentConfig,
): RepositoryProviderAuth {
  switch (provider) {
    case "github":
      return { token: repositoryToken ?? config.github?.token ?? "" };
    case "gitlab":
      return {
        token: repositoryToken ?? config.gitlab?.token ?? "",
        baseUrl: config.gitlab?.baseUrl,
      };
    default:
      return { token: "" };
  }
}

async function createProviderPullRequest(
  auth: RepositoryProviderAuth,
  provider: string,
  url: string,
  args: CreatePrArgs,
): Promise<PullRequestRef> {
  const baseArgs = buildProviderArgs(provider, url, args);
  switch (provider) {
    case "github": {
      return new GitHubPullRequestProvider().createPullRequest(
        auth,
        baseArgs as CreatePullRequestInput,
      );
    }
    case "gitlab": {
      return new GitLabPullRequestProvider().createPullRequest(
        auth,
        baseArgs as CreatePullRequestInput,
      );
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function findProviderPullRequestByBranch(
  auth: RepositoryProviderAuth,
  provider: string,
  url: string,
  args: Omit<CreatePrArgs, "title" | "body">,
): Promise<PullRequestRef | null> {
  const baseArgs = buildProviderArgs(provider, url, args);
  switch (provider) {
    case "github": {
      return new GitHubPullRequestProvider().findPullRequestByBranch(
        auth,
        baseArgs,
      );
    }
    case "gitlab": {
      return new GitLabPullRequestProvider().findPullRequestByBranch(
        auth,
        baseArgs,
      );
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

function buildProviderArgs(
  provider: string,
  url: string,
  args: Omit<CreatePrArgs, "title" | "body"> | CreatePrArgs,
): CreatePullRequestInput {
  switch (provider) {
    case "github": {
      const { owner, repo } = parseGitHubOwnerRepo(url);
      return {
        owner,
        repo,
        title: (args as CreatePrArgs).title ?? "",
        body: (args as CreatePrArgs).body ?? "",
        ...args,
      };
    }
    case "gitlab": {
      const projectPath = parseGitLabProjectPath(url);
      return {
        projectPath,
        title: (args as CreatePrArgs).title ?? "",
        body: (args as CreatePrArgs).body ?? "",
        ...args,
      };
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

function buildTranscript(events: { type: string; payload: unknown }[]): string {
  return events
    .map((event) => {
      const payload = event.payload as Record<string, unknown> | null;
      const text =
        payload?.content ?? payload?.body ?? payload?.message ?? payload?.summary ?? "";
      return `[${event.type}] ${String(text).slice(0, 2000)}`;
    })
    .join("\n---\n");
}

function buildPrBody(workItemId: string, sessionId: string): string {
  return `TaskForge automated pull request.\n\n- Work item: ${workItemId}\n- Session: ${sessionId}`;
}
