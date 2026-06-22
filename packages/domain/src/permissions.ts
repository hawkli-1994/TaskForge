export type ProjectRole = "owner" | "maintainer" | "contributor" | "viewer";
export type TeamRole = "owner" | "admin" | "member";

const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  owner: 4,
  maintainer: 3,
  contributor: 2,
  viewer: 1,
};

const TEAM_ROLE_RANK: Record<TeamRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function projectRoleRank(role: string): number {
  return PROJECT_ROLE_RANK[role as ProjectRole] ?? 0;
}

export function teamRoleRank(role: string): number {
  return TEAM_ROLE_RANK[role as TeamRole] ?? 0;
}

export function hasProjectAccess(
  userRole: string,
  requiredRole: ProjectRole,
): boolean {
  return projectRoleRank(userRole) >= projectRoleRank(requiredRole);
}

export function hasTeamAccess(
  userRole: string,
  requiredRole: TeamRole,
): boolean {
  return teamRoleRank(userRole) >= teamRoleRank(requiredRole);
}

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
