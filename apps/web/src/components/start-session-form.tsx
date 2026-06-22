"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mode } from "@taskforge/contracts";
import { apiFetch } from "@/lib/api";
import { Runner } from "@/lib/types";
import { Status, StatusIndicator } from "@/components/ui/status";

const modes: Mode[] = ["goal", "plan", "investigate"];

const STORAGE_KEY = "taskforge:last-session-selection";

function runnerStatus(
  runner: Runner,
): "online" | "offline" | "maintenance" | "degraded" {
  if (runner.status === "online") return "online";
  if (runner.status === "busy") return "online";
  if (runner.status === "error") return "degraded";
  return "offline";
}

interface LastSelection {
  projectId: string;
  workItemId: string;
  runnerId: string;
  runnerName: string;
  agentName: string;
  workingDirectory?: string;
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
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const runnerDropdownRef = useRef<HTMLDivElement>(null);
  const [workingDirectory, setWorkingDirectory] = useState("");
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        runnerDropdownRef.current &&
        !runnerDropdownRef.current.contains(e.target as Node)
      ) {
        setRunnerOpen(false);
      }
    }
    if (runnerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [runnerOpen]);

  const selectedRunner = runners.find((r) => r.id === runnerId);
  const agents = selectedRunner?.agents ?? [];

  function applyLastSelection() {
    if (!last) return;
    setRunnerId(last.runnerId);
    setAgentName(last.agentName);
    if (last.workingDirectory) {
      setWorkingDirectory(last.workingDirectory);
    }
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
        workingDirectory?: string;
        instruction?: string;
      } = { workItemId, mode };
      const trimmedRunner = runnerId.trim();
      if (trimmedRunner) body.runnerId = trimmedRunner;
      const trimmedAgent = agentName.trim();
      if (trimmedAgent) body.agentName = trimmedAgent;
      const trimmedWorkingDirectory = workingDirectory.trim();
      if (trimmedWorkingDirectory) body.workingDirectory = trimmedWorkingDirectory;
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
            workingDirectory: trimmedWorkingDirectory,
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

        <div className="relative" ref={runnerDropdownRef}>
          <label className="block text-sm font-medium text-gray-700">
            Runner instance
          </label>
          {runnersLoading ? (
            <div className="mt-1 text-sm text-gray-500">Loading runners...</div>
          ) : runnersError ? (
            <div className="mt-1 text-sm text-red-600">{runnersError}</div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRunnerOpen((v) => !v)}
                className="mt-1 flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {selectedRunner ? (
                  <span className="flex items-center gap-2">
                    <Status status={runnerStatus(selectedRunner)} className="text-xs">
                      <StatusIndicator />
                    </Status>
                    {selectedRunner.name}
                  </span>
                ) : (
                  <span className="text-gray-500">Select a runner</span>
                )}
                <span className="text-gray-400">▼</span>
              </button>
              {runnerOpen ? (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {runners.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setRunnerId(r.id);
                          setAgentName("");
                          setRunnerOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                          r.id === runnerId ? "bg-indigo-50" : ""
                        }`}
                      >
                        <Status status={runnerStatus(r)} className="text-xs">
                          <StatusIndicator />
                        </Status>
                        <span className="font-medium">{r.name}</span>
                        <span className="text-xs text-gray-500">
                          {r.agents.length > 0
                            ? `${r.agents.length} agent${
                                r.agents.length === 1 ? "" : "s"
                              }`
                            : "no agents"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
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
          <label htmlFor="session-working-directory" className="block text-sm font-medium text-gray-700">
            Working directory
          </label>
          <input
            id="session-working-directory"
            type="text"
            value={workingDirectory}
            onChange={(e) => setWorkingDirectory(e.target.value)}
            placeholder="/path/on/runner/node where the agent should run"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Absolute path on the runner host. If left empty, the runner uses the repository binding or its current directory.
          </p>
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
