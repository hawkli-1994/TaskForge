import { apiFetch } from "@/lib/api";
import { Project } from "@/lib/types";
import { ProjectCard } from "@/components/project-card";
import { CreateProjectForm } from "@/components/create-project-form";

export default async function HomePage() {
  let projects: Project[] = [];
  let error: string | null = null;

  try {
    projects = await apiFetch<Project[]>("/api/projects");
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load projects";
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
      </div>

      {error ? (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <CreateProjectForm />
    </div>
  );
}
