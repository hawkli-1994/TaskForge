"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Session, SessionEvent } from "@/lib/types";

const RESUMABLE_STATUSES = ["failed", "interrupted", "awaiting_input"];

function findMissingDirectoryEvent(events: SessionEvent[]) {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === "runner.working_directory_missing") {
      return events[i];
    }
  }
  return null;
}

export function SessionResume({
  session,
  events,
}: {
  session: Session;
  events: SessionEvent[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newDirectory, setNewDirectory] = useState(
    session.workingDirectory ?? "",
  );

  if (!RESUMABLE_STATUSES.includes(session.status)) {
    return null;
  }

  const missingEvent = findMissingDirectoryEvent(events);
  const isDirectoryMissing = !!missingEvent;

  async function doResume(workingDirectory?: string) {
    setBusy(true);
    setError(null);
    try {
      const body = workingDirectory ? { workingDirectory } : {};
      await apiFetch<{ id: string }>(`/api/sessions/${session.id}/resume`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resume session");
      setBusy(false);
    }
  }

  function handleResumeClick() {
    if (isDirectoryMissing) {
      setShowModal(true);
    } else {
      doResume();
    }
  }

  function handleModalSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newDirectory.trim()) return;
    setShowModal(false);
    doResume(newDirectory.trim());
  }

  return (
    <div className="mb-6">
      {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={handleResumeClick}
        disabled={busy}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy
          ? "Resuming..."
          : isDirectoryMissing
          ? "Update working directory and resume"
          : "Resume session"}
      </button>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">
              Working directory not found
            </h3>
            {missingEvent ? (
              <p className="mt-2 text-sm text-gray-600">
                The runner could not find{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  {(missingEvent.payload as { path?: string })?.path ?? "the directory"}
                </code>
                . Enter a new path on the runner host to continue.
              </p>
            ) : null}
            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              <input
                type="text"
                value={newDirectory}
                onChange={(e) => setNewDirectory(e.target.value)}
                placeholder="/path/on/runner/node"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDirectory.trim() || busy}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Resume
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
