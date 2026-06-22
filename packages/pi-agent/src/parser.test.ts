import { describe, it, expect } from "vitest";
import { detectPrFromEvents, type PrDetectionResult } from "./parser";
import type { LlmClient } from "./llm";

function fakeClient(response: PrDetectionResult): LlmClient {
  return {
    async complete() {
      return JSON.stringify(response);
    },
  };
}

describe("detectPrFromEvents", () => {
  it("detects a created PR", async () => {
    const result = await detectPrFromEvents(
      fakeClient({
        createdPr: true,
        prUrl: "https://github.com/org/repo/pull/42",
        prNumber: 42,
        headBranch: "taskforge/abc",
        baseBranch: "main",
        commitSha: "def1234",
      }),
      "agent summary",
    );
    expect(result.createdPr).toBe(true);
    expect(result.prNumber).toBe(42);
  });

  it("detects a pushed branch without PR", async () => {
    const result = await detectPrFromEvents(
      fakeClient({
        createdPr: false,
        headBranch: "taskforge/abc",
        baseBranch: "main",
      }),
      "pushed branch taskforge/abc",
    );
    expect(result.createdPr).toBe(false);
    expect(result.headBranch).toBe("taskforge/abc");
  });
});
