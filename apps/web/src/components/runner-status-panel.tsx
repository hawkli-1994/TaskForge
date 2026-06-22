import { Runner } from "@/lib/types";
import { Status, StatusIndicator } from "@/components/ui/status";

const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

function isRunnerRecent(runner: Runner): boolean {
  if (!runner.lastHeartbeatAt) return false;
  return (
    Date.now() - new Date(runner.lastHeartbeatAt).getTime() <
    HEARTBEAT_STALE_MS
  );
}

function runnerStatus(
  runner: Runner,
): "online" | "offline" | "maintenance" | "degraded" {
  if (!isRunnerRecent(runner)) return "offline";
  if (runner.status === "online" || runner.status === "busy") return "online";
  if (runner.status === "error") return "degraded";
  return "offline";
}

export function RunnerStatusPanel({ runners }: { runners: Runner[] }) {
  const recentRunners = runners.filter((r) => isRunnerRecent(r));

  if (recentRunners.length === 0) {
    return (
      <div className="text-xs text-gray-500">
        No local runners online for this project.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {recentRunners.map((runner) => {
        const agentNames = runner.agents.map((a) => a.name).join(", ");
        return (
          <Status
            key={runner.id}
            status={runnerStatus(runner)}
            className="text-xs"
            title={agentNames ? `agents: ${agentNames}` : undefined}
          >
            <StatusIndicator />
            <span className="font-medium text-gray-900">{runner.name}</span>
            {runner.agents.length > 0 ? (
              <span className="text-gray-500">
                ({runner.agents.length} agent
                {runner.agents.length === 1 ? "" : "s"})
              </span>
            ) : null}
          </Status>
        );
      })}
    </div>
  );
}
