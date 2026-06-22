import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001/api';
const DB_URL = process.env.DATABASE_URL || 'file:/home/krli/workspace/TaskForge/packages/db/dev.db?_journal_mode=WAL';
const USER_ID = process.env.TASKFORGE_USER_ID || 'e2e-tester';
const PROJECT_ROLE = process.env.TASKFORGE_PROJECT_ROLE || 'owner';
const GITLAB_API_TOKEN = process.env.GITLAB_API_TOKEN;
const GITLAB_BASE_URL = process.env.GITLAB_BASE_URL || 'http://172.18.5.179:8180';

const headers = {
  'Content-Type': 'application/json',
  'x-taskforge-user-id': USER_ID,
  'x-taskforge-project-role': PROJECT_ROLE,
};

async function api(method, endpoint, body) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw new Error(`API ${method} ${endpoint} failed ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function waitForApi(maxMs = 30000) {
  const start = Date.now();
  let lastErr = 'unknown';
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${API_URL}/projects`, { headers });
      if (res.ok) return;
      lastErr = `status ${res.status}`;
    } catch (e) {
      lastErr = e.message;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`API not ready: ${lastErr}`);
}

async function enableWal(dbPath) {
  // Use node:sqlite (Node 22+) to set WAL mode for better read/write concurrency.
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL;');
  db.close();
}

async function main() {
  // Clear any stale runner spool from previous runs.
  const spoolDir = path.join(os.homedir(), '.local/share/taskforge/spool');
  fs.rmSync(spoolDir, { recursive: true, force: true });
  console.log('Cleared runner spool');

  // Ensure SQLite WAL mode is enabled to avoid read timeouts under heavy event writes.
  const dbPath = DB_URL.replace(/^file:/, '').split('?')[0];
  await enableWal(dbPath);
  console.log('Enabled SQLite WAL mode for', dbPath);

  console.log('Starting API server...');
  const apiProc = spawn('pnpm', ['--filter', '@taskforge/api', 'start'], {
    cwd: '/home/krli/workspace/TaskForge',
    env: {
      ...process.env,
      DATABASE_URL: DB_URL,
      PORT: '3001',
      TASKFORGE_DISABLE_BULLMQ: 'true',
      GITLAB_API_TOKEN: GITLAB_API_TOKEN || '',
      GITLAB_BASE_URL: GITLAB_BASE_URL || '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  apiProc.stdout.on('data', d => console.log('[api]', d.toString().trim()));
  apiProc.stderr.on('data', d => console.error('[api]', d.toString().trim()));

  try {
    await waitForApi();
    console.log('API ready');

    // Create project
    const project = await api('POST', '/projects', { name: 'OpenCode E2E', description: 'ACP integration test' });
    console.log('Created project', project.id);

    // Create repository
    const repoUrl = GITLAB_API_TOKEN
      ? `${GITLAB_BASE_URL}/rxzy-opensource/wecom-rag`
      : 'https://github.com/rxzy-opensource/wecom-rag';
    const repo = await api('POST', `/projects/${project.id}/repositories`, {
      provider: GITLAB_API_TOKEN ? 'gitlab' : 'github',
      url: repoUrl,
      defaultBranch: 'main',
    });
    console.log('Created repository', repo.id);

    // Create work item linked to repository
    const workItem = await api('POST', '/work-items', {
      projectId: project.id,
      type: 'feature',
      priority: 'high',
      title: 'Read README and describe TaskForge',
      description: 'Use the local OpenCode ACP agent to read the README and summarize what TaskForge is.',
      acceptanceCriteria: 'A one-sentence summary is produced and events are streamed.',
      repositoryId: repo.id,
    });
    console.log('Created work item', workItem.id);

    // Create session (API will synchronously render prompt and move to dispatching/queued).
    const session = await api('POST', '/sessions', {
      workItemId: workItem.id,
      mode: 'goal',
      instruction: 'Run the ACP agent to read README and summarize.',
    });
    console.log('Created session', session.id, 'status', session.status);

    // Register runner
    const runner = await api('POST', '/runner/register', {
      name: 'opencodetest',
      project_id: project.id,
      adapter: 'opencode-acp',
      capabilities: { acp: true, opencode: true },
    });
    console.log('Registered runner', runner.runner_id, 'token', runner.token.slice(0, 8) + '...');

    // Write runner config
    const configDir = path.join(os.homedir(), '.config/taskforge');
    fs.mkdirSync(configDir, { recursive: true });
    const authPath = path.join(configDir, 'auth.json');
    fs.writeFileSync(authPath, JSON.stringify({ token: runner.token, runner_id: runner.runner_id }));
    const configPath = path.join(configDir, 'runner.toml');
    fs.writeFileSync(configPath, `
api_url = "${API_URL}"
token = "${runner.token}"
runner_id = "${runner.runner_id}"
project_id = "${project.id}"
agent_command = "opencode"

[[local_bindings]]
repository_id = "${repo.id}"
local_path = "/home/krli/workspace/TaskForge"
`.trim() + '\n');
    console.log('Wrote runner config to', configPath);

    // Start runner
    console.log('Starting runner...');
    const runnerProc = spawn('/home/krli/workspace/TaskForge/target/debug/taskforge-runner', ['start'], {
      env: { ...process.env, RUST_LOG: 'info,taskforge_runner_core::acp_host=debug' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    runnerProc.stdout.on('data', d => console.log('[runner]', d.toString().trim()));
    runnerProc.stderr.on('data', d => console.error('[runner]', d.toString().trim()));

    // Poll API for events (lightweight endpoint to avoid heavy session reads under load).
    let lastSeq = 0;
    let stableTicks = 0;
    let terminal = false;
    const seenTypes = new Set();
    const startTime = Date.now();
    while (Date.now() - startTime < 90000) {
      const events = await api('GET', `/sessions/${session.id}/events?afterSeq=${lastSeq}`);
      if (events.length > 0) {
        for (const e of events) {
          console.log(`[event ${e.seq}] ${e.type}: ${JSON.stringify(e.payload).slice(0, 200)}`);
          seenTypes.add(e.type);
          if (e.type === 'session.completed' || e.type === 'session.failed') {
            terminal = true;
          }
        }
        lastSeq = events[events.length - 1].seq;
        stableTicks = 0;
      } else {
        stableTicks++;
      }
      if (terminal) {
        console.log('Session reached terminal event');
        break;
      }
      // Once we have evidence that opencode is wired through (thinking + tool call),
      // we can declare success without waiting for the full agent run.
      if (seenTypes.has('agent.thinking') && seenTypes.has('tool.call')) {
        console.log('Observed ACP thinking and tool-call events; declaring success.');
        break;
      }
      if (stableTicks > 15) {
        console.log('No new events for 15 ticks, breaking');
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    try { process.kill(-apiProc.pid, 'SIGKILL'); } catch {}
    try { process.kill(-runnerProc.pid, 'SIGKILL'); } catch {}

    if (!seenTypes.has('agent.thinking') || !seenTypes.has('tool.call')) {
      throw new Error(`E2E did not observe expected ACP events. Seen types: ${[...seenTypes].join(', ')}`);
    }
    console.log('E2E test passed');
  } catch (e) {
    console.error('E2E test failed:', e);
    try { process.kill(-apiProc.pid, 'SIGKILL'); } catch {}
    process.exit(1);
  }
}

main();
