import Link from "next/link";
import { WorkItem } from "@/lib/types";

const priorityClasses: Record<WorkItem["priority"], string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const typeLabels: Record<WorkItem["type"], string> = {
  bug: "Bug",
  feature: "Feature",
  tech_debt: "Tech Debt",
  finding: "Finding",
};

export function WorkItemCard({
  workItem,
  projectId,
}: {
  workItem: WorkItem;
  projectId: string;
}) {
  return (
    <Link
      href={`/projects/${projectId}/work-items/${workItem.id}`}
      className="block bg-white p-3 rounded border border-gray-200 shadow-sm hover:shadow transition"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {typeLabels[workItem.type]}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityClasses[workItem.priority]}`}
        >
          {workItem.priority}
        </span>
      </div>
      <h3 className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">
        {workItem.title}
      </h3>
      <div className="mt-2 text-xs text-gray-600">
        Assignee: {workItem.assignee?.name ?? "Unassigned"}
      </div>
      {workItem.activeSession ? (
        <div className="mt-2 text-xs font-semibold text-indigo-600">
          ● {workItem.activeSession.status.replace(/_/g, " ")}
        </div>
      ) : null}
    </Link>
  );
}
