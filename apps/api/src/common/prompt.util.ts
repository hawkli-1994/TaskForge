type WorkItemLike = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
};

type ContextBundleLike = {
  summary: string | null;
  goal: string | null;
  acceptanceCriteria: string | null;
  promptInput: string | null;
} | null;

export function renderPrompt(
  template: string,
  workItem: WorkItemLike,
  bundle: ContextBundleLike,
): string {
  const goal = bundle?.goal ?? workItem.title ?? "";
  const acceptanceCriteria =
    bundle?.acceptanceCriteria ?? workItem.acceptanceCriteria ?? "";
  const context = bundle?.promptInput ?? "";

  return template
    .replace(/{{workItemId}}/g, workItem.id)
    .replace(/{{projectId}}/g, workItem.projectId)
    .replace(/{{goal}}/g, goal)
    .replace(/{{acceptanceCriteria}}/g, acceptanceCriteria)
    .replace(/{{context}}/g, context)
    .replace(/{{title}}/g, workItem.title)
    .replace(/{{description}}/g, workItem.description ?? "")
    .replace(/{{summary}}/g, bundle?.summary ?? workItem.title);
}
