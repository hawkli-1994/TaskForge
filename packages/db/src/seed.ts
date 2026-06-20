import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.upsert({
    where: { id: "demo_project_seed" },
    update: {},
    create: {
      id: "demo_project_seed",
      name: "TaskForge Demo",
      description: "A demo project used to validate the v0.1 control plane.",
    },
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
      version: 1,
      template: `You are working on TaskForge WorkItem {{workItemId}} in project {{projectId}}.
Goal: {{goal}}
Acceptance criteria: {{acceptanceCriteria}}
Context: {{context}}
Mode: /goal. You may read and modify files within the allowed paths and run allowed commands. Output a summary, change list, and verification results.`,
      checksum: "goal-v1",
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
