import Link from "next/link";
import { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}/board`}
      className="block bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-md transition"
    >
      <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
      {project.description ? (
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
          {project.description}
        </p>
      ) : null}
      <div className="mt-3 text-xs text-gray-500">
        Updated {new Date(project.updatedAt).toLocaleDateString()}
      </div>
    </Link>
  );
}
