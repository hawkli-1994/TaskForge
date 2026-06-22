import { apiFetch } from "@/lib/api";
import { Session, SessionEvent } from "@/lib/types";
import { SessionEventStream } from "@/components/session-event-stream";
import { SessionResume } from "@/components/session-resume";

export default async function SessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  let session: Session | null = null;
  let events: SessionEvent[] = [];
  let error: string | null = null;

  try {
    [session, events] = await Promise.all([
      apiFetch<Session>(`/api/sessions/${params.sessionId}`),
      apiFetch<SessionEvent[]>(`/api/sessions/${params.sessionId}/events`),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load session";
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!session) {
    return <div className="text-gray-600">Loading session...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Session</h1>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-white p-3 shadow-sm border border-gray-200">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Status
            </div>
            <div className="mt-1 font-medium text-gray-900">
              {session.status.replace(/_/g, " ")}
            </div>
          </div>
          <div className="rounded-md bg-white p-3 shadow-sm border border-gray-200">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Mode
            </div>
            <div className="mt-1 font-medium text-gray-900">/{session.mode}</div>
          </div>
          <div className="rounded-md bg-white p-3 shadow-sm border border-gray-200">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Runner / Agent
            </div>
            <div className="mt-1 font-medium text-gray-900">
              {session.runnerName ?? session.runnerId ?? "Unassigned"}
              {session.acpAgentInfoJson?.agentName ? (
                <span className="ml-2 text-sm text-gray-600">
                  / {session.acpAgentInfoJson.agentName}
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-md bg-white p-3 shadow-sm border border-gray-200">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Working directory
            </div>
            <div className="mt-1 break-all font-mono text-sm text-gray-900">
              {session.workingDirectory ?? "Default"}
            </div>
          </div>
        </div>
      </div>

      <SessionResume session={session} events={events} />

      <SessionEventStream sessionId={session.id} initialEvents={events} />
    </div>
  );
}
