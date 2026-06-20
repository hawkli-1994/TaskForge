"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkItemType, Priority } from "@taskforge/contracts";
import { apiFetch } from "@/lib/api";

export function CreateWorkItemForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WorkItemType>("feature");
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await apiFetch("/api/work-items", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          type,
          priority,
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });
      setTitle("");
      setDescription("");
      setType("feature");
      setPriority("medium");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        + New Work Item
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 bg-white p-4 rounded-lg shadow border border-gray-200 max-w-xl"
    >
      <h3 className="text-md font-semibold text-gray-900 mb-3">New Work Item</h3>
      <div className="space-y-3">
        <div>
          <label htmlFor="wi-title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            id="wi-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Work item title"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="wi-type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="wi-type"
              value={type}
              onChange={(e) => setType(e.target.value as WorkItemType)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="tech_debt">Tech Debt</option>
              <option value="finding">Finding</option>
            </select>
          </div>
          <div>
            <label htmlFor="wi-priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              id="wi-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="wi-description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="wi-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Optional description"
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
