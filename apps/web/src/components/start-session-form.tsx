"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mode } from "@taskforge/contracts";
import { apiFetch } from "@/lib/api";
import { Runner } from "@/lib/types";

const modes: Mode[] = ["goal", "plan", "investigate"];

const STORAGE_KEY = "taskforge:last-session-selection";

interface LastSelection {
  projectId: string;
  workItemId: string;
  runnerId: string;
  runnerName: string;
  agentName: string;
  sessionId?: string;
}

export function StartSessionForm({
  projectId,
  workItemId,
}: {
  projectId: string;
  workItemId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("goal");
  const [runners, setRunners] = useState<Runner[]>([]);
  const [runnersLoading, setRunnersLoading] = useState(true);
  const [runnersError, setRunnersError] = useState<string | null>(null);
  const [runnerId, setRunnerId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<LastSelection | null>(null);

  useEffect(() => {
    apiFetch<Runner[]>(`/api/runner/projects/${projectId}`)
      .then((data) => {
        setRunners(data);
      })
      .catch((e) => {
        setRunnersError(e instanceof Error ? e.message : "Failed to load runners");
      })
      .finally(() => setRunnersLoading(false));

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LastSelection;
        if (parsed.projectId === projectId) {
          setLast(parsed);
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, [projectId]);

  const selectedRunner = runners.find((r) => r.id === runnerId);
  const agents = selectedRunner?.agents ?? [];

  function applyLastSelection() {
    if (!last) return;
    setRunnerId(last.runnerId);
    setAgentName(last.agentName);
    setMode("goal");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: {
        workItemId: string;
        mode: Mode;
        runnerId?: string;
        agentName?: string;
        instruction?: string;
      } = { workItemId, mode };
      const trimmedRunner = runnerId.trim();
      if (trimmedRunner) body.runnerId = trimmedRunner;
      const trimmedAgent = agentName.trim();
      if (trimmedAgent) body.agentName = trimmedAgent;
      const trimmedInstruction = instruction.trim();
      if (trimmedInstruction) body.instruction = trimmedInstruction;

      const session = await apiFetch<{ id: string }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const runner = runners.find((r) => r.id === runnerId);
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            projectId,
            workItemId,
            runnerId,
            runnerName: runner?.name ?? "",
            agentName,
            sessionId: session.id,
          }),
        );
      } catch {
        // ignore storage errors
      }

      router.push(`/sessions/${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-5 rounded-lg shadow border border-gray-200"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Start Session</h2>

      {last && (
        <div className="mb-4 rounded-md bg-indigo-50 p-3 text-sm">
          <div className="font-medium text-indigo-900">Last used</div>
          <div className="text-indigo-700">
            {last.runnerName} · {last.agentName}
          </div>
          <button
            type="button"
            onClick={applyLastSelection}
            className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Use {last.runnerName} + {last.agentName}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor="session-mode" className="block text-sm font-medium text-gray-700">
            Mode
          </label>
          <select
            id="session-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {modes.map((m) => (
              <option key={m} value={m}>
                /{m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="session-runner" className="block text-sm font-medium text-gray-700">
            Runner instance
          </label>
          {runnersLoading ? (
            <div className="mt-1 text-sm text-gray-500">Loading runners...</div>
          ) : runnersError ? (
            <div className="mt-1 text-sm text-red-600">{runnersError}</div>
          ) : (
            <select
              id="session-runner"
              value={runnerId}
              onChange={(e) => {
                setRunnerId(e.target.value);
                setAgentName("");
              }}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select a runner</option>
              {runners.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.status})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="session-agent" className="block text-sm font-medium text-gray-700">
            Agent
          </label>
          <select
            id="session-agent"
            value={agentName}
            disabled={!selectedRunner || agents.length === 0}
            onChange={(e) => setAgentName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">
              {selectedRunner
                ? agents.length === 0
                  ? "No agents reported"
                  : "Select an agent"
                : "Select a runner first"}
            </option>
            {agents.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name} {a.adapter ? `(${a.adapter})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="session-instruction" className="block text-sm font-medium text-gray-700">
            Instruction (optional)
          </label>
          <textarea
            id="session-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Additional guidance for the agent"
            rows={3}
          />
        </div>

        {error ? (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={busy || !runnerId || !agentName}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "Starting..." : "Start Session"}
        </button>
      </div>
    </form>
  );
}
