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
