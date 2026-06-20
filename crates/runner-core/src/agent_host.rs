use crate::error::RunnerError;
use crate::platform::ClaimedSession;
use serde_json::{Value, json};
use tokio::sync::mpsc;
use tokio::time::{Duration, sleep};
use tracing::{info, warn};

#[derive(Debug, Clone)]
pub struct SessionEvent {
    pub seq: u64,
    pub event_type: String,
    pub payload: Value,
}

pub trait AgentHost: Send + Sync {
    fn run(
        &self,
        session: ClaimedSession,
        event_tx: mpsc::Sender<SessionEvent>,
    ) -> impl std::future::Future<Output = Result<(), RunnerError>> + Send;
}

pub struct StubAgentHost;

impl StubAgentHost {
    pub fn new() -> Self {
        Self
    }

    fn sample_patch() -> String {
        r#"--- a/src/lib.rs
+++ b/src/lib.rs
@@ -1,5 +1,5 @@
 pub fn greeting() -> &'static str {
-    "hello"
+    "hello, world"
 }
 
 pub fn add(a: i32, b: i32) -> i32 {
"#
        .to_string()
    }
}

impl Default for StubAgentHost {
    fn default() -> Self {
        Self::new()
    }
}

impl AgentHost for StubAgentHost {
    async fn run(
        &self,
        session: ClaimedSession,
        event_tx: mpsc::Sender<SessionEvent>,
    ) -> Result<(), RunnerError> {
        info!("stub agent starting session {}", session.session_id);

        let events = vec![
            (
                1u64,
                "session.started",
                json!({ "session_id": session.session_id, "mode": session.mode }),
            ),
            (
                2u64,
                "command.started",
                json!({ "command": "analyze prompt", "cwd": "/workspace" }),
            ),
            (
                3u64,
                "command.output",
                json!({ "stdout": "analyzing work item...", "stderr": "" }),
            ),
            (4u64, "command.finished", json!({ "exit_code": 0 })),
            (
                5u64,
                "file.changed",
                json!({
                    "path": "src/lib.rs",
                    "change_type": "modified",
                    "diff": Self::sample_patch()
                }),
            ),
            (
                6u64,
                "verification.started",
                json!({ "tool": "cargo test", "args": ["--lib"] }),
            ),
            (7u64, "verification.passed", json!({ "tool": "cargo test" })),
            (
                8u64,
                "session.completed",
                json!({ "session_id": session.session_id, "outcome": "success" }),
            ),
        ];

        for (seq, event_type, payload) in events {
            sleep(Duration::from_millis(800)).await;
            if event_tx
                .send(SessionEvent {
                    seq,
                    event_type: event_type.to_string(),
                    payload,
                })
                .await
                .is_err()
            {
                warn!("event receiver dropped; aborting agent session");
                return Err(RunnerError::AgentHost("event receiver dropped".into()));
            }
        }

        info!("stub agent completed session {}", session.session_id);
        Ok(())
    }
}
