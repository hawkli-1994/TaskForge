import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { id: "demo_user_seed" },
    update: {},
    create: {
      id: "demo_user_seed",
      email: "demo@taskforge.local",
      name: "Demo User",
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "demo_project_seed" },
    update: {},
    create: {
      id: "demo_project_seed",
      name: "TaskForge Demo",
      description: "A demo project used to validate the v0.1 control plane.",
      createdBy: demoUser.id,
      members: {
        create: { userId: demoUser.id, role: "owner" },
      },
    },
  });

  // Ensure membership exists even if the project was created before this seed ran.
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: demoUser.id },
    },
    update: {},
    create: { projectId: project.id, userId: demoUser.id, role: "owner" },
  });

  await prisma.workItem.upsert({
    where: { id: "demo_work_item_seed" },
    update: {},
    create: {
      id: "demo_work_item_seed",
      projectId: project.id,
      type: "bug",
      status: "ready",
      priority: "high",
      title: "Fix ACP event relay dispatch gate",
      description: "Agent session updates are not being projected into SessionEvent rows.",
      acceptanceCriteria: "All ACP session/update messages must be persisted with a monotonic seq.",
    },
  });

  const promptVersions = [
    {
      mode: "goal",
      version: 3,
      template: `You are working on TaskForge WorkItem {{workItemId}} in project {{projectId}}.
Goal: {{goal}}
Acceptance criteria: {{acceptanceCriteria}}
Context: {{context}}
Mode: /goal. You may read and modify files within the allowed paths and run allowed commands.

When you have completed the code changes, follow this git workflow:
1. Create a new branch named "taskforge/{{workItemId}}".
2. Stage only the files you intentionally changed.
3. Commit with a message that starts with "fix(taskforge-{{workItemId}}): " and summarizes the change.
4. Push the branch to the remote origin.
5. If you are able to create a pull request, create it and report the PR URL and number in your final summary.
6. If you cannot create a pull request, report the pushed branch name and the latest commit SHA.

Output a summary, change list, verification results, and PR/branch reporting.`,
      checksum: "goal-v3",
    },
    {
      mode: "plan",
      version: 1,
      template: `You are planning work for TaskForge WorkItem {{workItemId}}.
Goal: {{goal}}
Context: {{context}}
Mode: /plan. Do not modify code. Output a plan, risks, involved files, and verification strategy.`,
      checksum: "plan-v1",
    },
    {
      mode: "investigate",
      version: 1,
      template: `Investigate TaskForge WorkItem {{workItemId}}.
Goal: {{goal}}
Context: {{context}}
Mode: /investigate. Do not modify code. Output root-cause evidence and next steps.`,
      checksum: "investigate-v1",
    },
  ];

  for (const pv of promptVersions) {
    await prisma.promptVersion.upsert({
      where: { mode_version: { mode: pv.mode, version: pv.version } },
      update: {},
      create: pv,
    });
  }

  console.log("Seeded demo project and prompt versions.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
