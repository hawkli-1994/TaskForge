import { describe, it, expect } from "vitest";
import {
  hasProjectAccess,
  hasTeamAccess,
  projectRoleRank,
  teamRoleRank,
} from "./permissions";

describe("permissions", () => {
  it("ranks project roles by authority", () => {
    expect(projectRoleRank("owner")).toBeGreaterThan(
      projectRoleRank("maintainer"),
    );
    expect(projectRoleRank("maintainer")).toBeGreaterThan(
      projectRoleRank("contributor"),
    );
    expect(projectRoleRank("contributor")).toBeGreaterThan(
      projectRoleRank("viewer"),
    );
    expect(projectRoleRank("unknown")).toBe(0);
  });

  it("checks project access by rank", () => {
    expect(hasProjectAccess("owner", "contributor")).toBe(true);
    expect(hasProjectAccess("maintainer", "contributor")).toBe(true);
    expect(hasProjectAccess("contributor", "contributor")).toBe(true);
    expect(hasProjectAccess("viewer", "contributor")).toBe(false);
  });

  it("ranks team roles by authority", () => {
    expect(teamRoleRank("owner")).toBeGreaterThan(teamRoleRank("admin"));
    expect(teamRoleRank("admin")).toBeGreaterThan(teamRoleRank("member"));
    expect(teamRoleRank("unknown")).toBe(0);
  });

  it("checks team access by rank", () => {
    expect(hasTeamAccess("owner", "admin")).toBe(true);
    expect(hasTeamAccess("admin", "admin")).toBe(true);
    expect(hasTeamAccess("member", "admin")).toBe(false);
  });
});
