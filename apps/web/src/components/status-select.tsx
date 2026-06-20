"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkItemStatus } from "@taskforge/contracts";
import { apiFetch } from "@/lib/api";

const statuses: WorkItemStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "blocked",
  "needs_review",
  "done",
  "cancelled",
];

function formatStatus(status: WorkItemStatus) {
  return status.replace(/_/g, " ");
}

export function StatusSelect({
  workItemId,
  current,
}: {
  workItemId: string;
  current: WorkItemStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(current);
  }, [current]);

  async function handleChange(value: WorkItemStatus) {
    setStatus(value);
    setBusy(true);
    try {
      await apiFetch(`/api/work-items/${workItemId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: value }),
      });
      router.refresh();
    } catch {
      setStatus(current);
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={status}
      disabled={busy}
      onChange={(e) => handleChange(e.target.value as WorkItemStatus)}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm capitalize focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {formatStatus(s)}
        </option>
      ))}
    </select>
  );
}
