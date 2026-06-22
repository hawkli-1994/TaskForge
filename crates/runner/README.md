# taskforge-runner

CLI binary for the TaskForge local runner. It connects to the TaskForge
platform API, claims Agent sessions, and executes them using a local agent host.

## Build & Run

```bash
cargo build -p taskforge-runner
cargo run -- --help
cargo test -p taskforge-runner
```

## Quick Start

```bash
# Authenticate
cargo run -- login --token <TOKEN>

# Register the runner with a project
cargo run -- register --name my-runner --project-id <PROJECT_ID>

# Bind a repository to a local checkout
cargo run -- bind-repo --repository-id <REPO_ID> --local-path /path/to/repo

# Start the runner loop
cargo run -- start
```

## Using OpenCode ACP

The runner can drive a local OpenCode agent over the ACP JSON-RPC protocol on stdio.

1. Install `opencode` and make sure it is on your `PATH`:

   ```bash
   opencode --version
   opencode acp   # should start the ACP server
   ```

2. Authenticate the runner:

   ```bash
   taskforge-runner login --token <TOKEN>
   ```

3. Register the runner with the `opencode-acp` adapter:

   ```bash
   taskforge-runner register --name my-runner --project-id <PROJECT_ID> --adapter opencode-acp
   ```

4. Bind the platform repository to your local checkout:

   ```bash
   taskforge-runner bind-repo --repository-id <REPO_ID> --local-path /path/to/repo
   ```

5. Configure the agent command. `taskforge-runner` does not have a `config set`
   command yet, so edit `~/.config/taskforge/runner.toml` and add:

   ```toml
   agent_command = "opencode"
   ```

   The runner will spawn `opencode acp`. If you need a custom path or want to
   pass extra arguments, set the full command, for example:

   ```toml
   agent_command = "/usr/local/bin/opencode"
   ```

6. Start the runner:

   ```bash
   taskforge-runner start
   ```

The runner will claim sessions from the API, launch OpenCode ACP in the bound
repository's local path, stream `session/update` notifications as TaskForge
session events, and emit `session.completed` when the prompt finishes.
