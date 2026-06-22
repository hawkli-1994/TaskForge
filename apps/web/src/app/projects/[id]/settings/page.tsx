import { apiFetch } from "@/lib/api";
import { Project, Repository } from "@/lib/types";
import { RepositoryConnectForm } from "@/components/repository-connect-form";
import { RunnerSettings } from "@/components/runner-settings";
import Link from "next/link";

async function getProject(id: string): Promise<Project | null> {
  try {
    return await apiFetch<Project>(`/api/projects/${id}`);
  } catch {
    return null;
  }
}

async function getRepositories(id: string): Promise<Repository[]> {
  try {
    return await apiFetch<Repository[]>(`/api/projects/${id}/repositories`);
  } catch {
    return [];
  }
}

function providerLabel(repo: Repository) {
  const parts = repo.url.replace(/\.git$/, "").split("/");
  const name = parts[parts.length - 1] ?? repo.url;
  return `${repo.provider}/${name}`;
}

export default async function SettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const [project, repositories] = await Promise.all([
    getProject(params.id),
    getRepositories(params.id),
  ]);
  if (!project) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        Project not found
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-600">Project settings</p>
        </div>
        <Link
          href={`/projects/${params.id}/board`}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to board
        </Link>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Connected repositories
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          A project can be bound to multiple code repositories. Tokens are stored
          encrypted at rest and used to fetch metadata and open pull requests.
        </p>
        {repositories.length > 0 ? (
          <ul className="mb-4 divide-y divide-gray-100 rounded-md border border-gray-200">
            {repositories.map((repo) => (
              <li key={repo.id} className="flex items-center justify-between px-4 py-2">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {providerLabel(repo)}
                </a>
                <span className="text-xs text-gray-500">
                  {repo.defaultBranch ?? "unknown branch"} · {repo.syncStatus}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <RepositoryConnectForm projectId={params.id} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Local runners & agents
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Register local runners and view their online status and reported agents.
          The real agent command is configured on the runner host; this page only
          shows what the runner reports.
        </p>
        <RunnerSettings projectId={params.id} />
      </section>
    </div>
  );
}
