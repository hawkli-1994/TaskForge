import { describe, it, expect } from "vitest";
import {
  canTransitionWorkItem,
  canStartWorkItemSession,
  isSessionActive,
  isSessionTerminal,
  nextEventSeq,
  isValidEventSequence,
  runnerCanClaimSession,
  workItemStatusFromSessionResult,
} from "./state-machines";

describe("state machines", () => {
  it("allows valid work item transitions", () => {
    expect(canTransitionWorkItem("backlog", "ready")).toBe(true);
    expect(canTransitionWorkItem("ready", "in_progress")).toBe(true);
    expect(canTransitionWorkItem("in_progress", "needs_review")).toBe(true);
    expect(canTransitionWorkItem("done", "in_progress")).toBe(false);
  });

  it("prevents starting a session for terminal or active work items", () => {
    expect(canStartWorkItemSession("ready", null)).toBe(true);
    expect(canStartWorkItemSession("in_progress", "sess_123")).toBe(false);
    expect(canStartWorkItemSession("done", null)).toBe(false);
  });

  it("classifies session statuses", () => {
    expect(isSessionActive("running")).toBe(true);
    expect(isSessionActive("completed")).toBe(false);
    expect(isSessionTerminal("failed")).toBe(true);
    expect(isSessionTerminal("running")).toBe(false);
  });

  it("computes event sequence", () => {
    expect(nextEventSeq(undefined)).toBe(1);
    expect(nextEventSeq(5)).toBe(6);
    expect(isValidEventSequence(6, 6)).toBe(true);
    expect(isValidEventSequence(7, 6)).toBe(false);
  });

  it("only online runners can claim sessions", () => {
    expect(runnerCanClaimSession("online")).toBe(true);
    expect(runnerCanClaimSession("busy")).toBe(false);
    expect(runnerCanClaimSession("offline")).toBe(false);
  });

  it("maps session result to work item status", () => {
    expect(workItemStatusFromSessionResult("completed")).toBe("needs_review");
    expect(workItemStatusFromSessionResult("failed")).toBe("blocked");
    expect(workItemStatusFromSessionResult("interrupted")).toBe("blocked");
    expect(workItemStatusFromSessionResult("running")).toBeNull();
  });
});
