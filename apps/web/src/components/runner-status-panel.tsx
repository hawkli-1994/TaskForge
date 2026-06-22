import { Runner } from "@/lib/types";

const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

function isRunnerRecent(runner: Runner): boolean {
  if (!runner.lastHeartbeatAt) return false;
  return (
    Date.now() - new Date(runner.lastHeartbeatAt).getTime() <
    HEARTBEAT_STALE_MS
  );
}

export function RunnerStatusPanel({ runners }: { runners: Runner[] }) {
  const onlineRunners = runners.filter(
    (r) =>
      isRunnerRecent(r) && (r.status === "online" || r.status === "busy"),
  );

  if (onlineRunners.length === 0) {
    return (
      <div className="text-xs text-gray-500">
        No local runners online for this project.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {onlineRunners.map((runner) => {
        const agentNames = runner.agents.map((a) => a.name).join(", ");
        return (
          <div
            key={runner.id}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs"
            title={agentNames ? `agents: ${agentNames}` : undefined}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                runner.status === "online" ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span className="font-medium text-gray-900">{runner.name}</span>
            {runner.agents.length > 0 ? (
              <span className="text-gray-500">
                ({runner.agents.length} agent
                {runner.agents.length === 1 ? "" : "s"})
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
