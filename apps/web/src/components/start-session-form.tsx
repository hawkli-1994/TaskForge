"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Mode } from "@taskforge/contracts";
import { apiFetch } from "@/lib/api";

const modes: Mode[] = ["goal", "plan", "investigate"];

export function StartSessionForm({ workItemId }: { workItemId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("goal");
  const [runnerId, setRunnerId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body: {
        workItemId: string;
        mode: Mode;
        runnerId?: string;
        instruction?: string;
      } = { workItemId, mode };
      const trimmedRunner = runnerId.trim();
      if (trimmedRunner) body.runnerId = trimmedRunner;
      const trimmedInstruction = instruction.trim();
      if (trimmedInstruction) body.instruction = trimmedInstruction;

      const session = await apiFetch<{ id: string }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/sessions/${session.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-5 rounded-lg shadow border border-gray-200"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Start Session</h2>
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
            Runner ID (optional)
          </label>
          <input
            id="session-runner"
            type="text"
            value={runnerId}
            onChange={(e) => setRunnerId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="runner_123"
          />
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
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "Starting..." : "Start Session"}
        </button>
      </div>
    </form>
  );
}
