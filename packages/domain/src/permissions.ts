export type ProjectRole = "owner" | "maintainer" | "contributor" | "reviewer" | "viewer";

const ROLE_ACTIONS: Record<ProjectRole, string[]> = {
  owner: ["*"],
  maintainer: [
    "project:read",
    "project:update",
    "workitem:create",
    "workitem:update",
    "workitem:start_session",
    "workitem:stop_session",
    "session:read",
    "session:comment",
    "finding:manage",
    "runner:configure",
    "audit:read",
  ],
  contributor: [
    "project:read",
    "workitem:create",
    "workitem:update_own",
    "workitem:start_session_own",
    "workitem:stop_session_own",
    "session:read",
    "session:comment",
  ],
  reviewer: [
    "project:read",
    "workitem:read",
    "session:read",
    "session:comment",
    "audit:read",
  ],
  viewer: ["project:read", "workitem:read", "session:read"],
};

export function projectRoleCan(
  role: ProjectRole,
  action: string,
  isOwn?: boolean,
): boolean {
  const actions = ROLE_ACTIONS[role] ?? [];
  if (actions.includes("*")) return true;
  if (actions.includes(action)) return true;
  if (isOwn && actions.includes(`${action}_own`)) return true;
  return false;
}
