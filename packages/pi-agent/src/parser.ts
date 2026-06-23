import { z } from "zod";
import type { LlmClient } from "./llm";

const PrDetectionResultSchema = z.object({
  createdPr: z.boolean(),
  prUrl: z.string().nullable().optional(),
  prNumber: z.number().nullable().optional(),
  headBranch: z.string().nullable().optional(),
  baseBranch: z.string().nullable().optional(),
  commitSha: z.string().nullable().optional(),
  reasoning: z.string().optional(),
});

export type PrDetectionResult = z.infer<typeof PrDetectionResultSchema>;

const SYSTEM_PROMPT = `You are a strict JSON extractor. Read the provided AI agent session transcript and determine whether the agent created a pull request, only pushed a branch, or did neither.

Output ONLY a single JSON object with these fields:
- createdPr: boolean — true only if the agent explicitly reports creating/opening a pull request with a URL or number.
- prUrl: string | null — the pull request URL if reported.
- prNumber: number | null — the pull request number if reported.
- headBranch: string | null — the branch the agent pushed or used as the PR head.
- baseBranch: string | null — the target branch if reported, otherwise null.
- commitSha: string | null — the commit SHA if reported.
- reasoning: string | null — a one-sentence explanation of your decision.

Rules:
1. Do not wrap the JSON in markdown fences.
2. Use null for unknown fields.
3. If the agent explicitly says it opened a PR and provides a URL or number, set createdPr=true.
4. If the agent only pushed a branch (e.g., "git push origin taskforge/...") and did not create a PR, set createdPr=false and provide headBranch. The system will then look up any existing PR for that branch on the remote provider.
5. If the agent reports a branch but you cannot tell whether a PR exists, still provide headBranch so the system can check.`;

export async function detectPrFromEvents(
  client: LlmClient,
  eventsText: string,
): Promise<PrDetectionResult> {
  const raw = await client.complete(SYSTEM_PROMPT, eventsText);
  const cleaned = extractJson(raw);
  const parsed = JSON.parse(cleaned);
  return PrDetectionResultSchema.parse(parsed);
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    const withoutFences = trimmed
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```$/, "");
    return withoutFences.trim();
  }
  return trimmed;
}
