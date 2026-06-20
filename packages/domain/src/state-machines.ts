import {
  type WorkItemStatus,
  type SessionStatus,
  type RunnerStatus,
  type EventType,
} from "@taskforge/contracts";

export const WORK_ITEM_STATUSES: WorkItemStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "blocked",
  "needs_review",
  "done",
  "cancelled",
];

export const WORK_ITEM_TERMINAL_STATUSES: WorkItemStatus[] = ["done", "cancelled"];

export const SESSION_STATUSES: SessionStatus[] = [
  "created",
  "context_compiling",
  "queued",
  "dispatching",
  "running",
  "awaiting_input",
  "awaiting_approval",
  "verifying",
  "completed",
  "failed",
  "cancelled",
  "interrupted",
];

export const SESSION_TERMINAL_STATUSES: SessionStatus[] = [
  "completed",
  "failed",
  "cancelled",
  "interrupted",
];

export const RUNNER_ONLINE_STATUSES: RunnerStatus[] = ["online", "busy"];

const WORK_ITEM_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  backlog: ["ready", "cancelled"],
  ready: ["in_progress", "backlog", "cancelled"],
  in_progress: ["blocked", "needs_review", "done", "cancelled", "ready"],
  blocked: ["in_progress", "ready", "cancelled"],
  needs_review: ["done", "in_progress", "blocked", "cancelled"],
  done: [],
  cancelled: [],
};

export function canTransitionWorkItem(
  from: WorkItemStatus,
  to: WorkItemStatus,
): boolean {
  if (from === to) return true;
  return WORK_ITEM_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isWorkItemTerminal(status: WorkItemStatus): boolean {
  return WORK_ITEM_TERMINAL_STATUSES.includes(status);
}

export function canStartWorkItemSession(
  status: WorkItemStatus,
  activeSessionId?: string | null,
): boolean {
  if (isWorkItemTerminal(status)) return false;
  if (activeSessionId) return false;
  return true;
}

export function isSessionActive(status: SessionStatus): boolean {
  return !SESSION_TERMINAL_STATUSES.includes(status);
}

export function isSessionTerminal(status: SessionStatus): boolean {
  return SESSION_TERMINAL_STATUSES.includes(status);
}

export function nextEventSeq(lastSeq?: number | null): number {
  return (lastSeq ?? 0) + 1;
}

export function isValidEventSequence(seq: number, expected: number): boolean {
  return seq === expected;
}

export function runnerCanClaimSession(status: RunnerStatus): boolean {
  return status === "online";
}

export function workItemStatusFromSessionResult(
  sessionStatus: SessionStatus,
): WorkItemStatus | null {
  if (sessionStatus === "completed") return "needs_review";
  if (sessionStatus === "failed" || sessionStatus === "interrupted") return "blocked";
  return null;
}
