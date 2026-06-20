use crate::error::RunnerError;
use crate::platform::PlatformClient;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use tracing::{debug, error, info};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpooledEvent {
    pub runner_id: String,
    pub session_id: String,
    pub seq: u64,
    #[serde(rename = "type")]
    pub event_type: String,
    pub payload: Value,
}

pub struct LocalSpool {
    dir: PathBuf,
}

impl LocalSpool {
    pub fn new(dir: impl AsRef<Path>) -> Self {
        Self {
            dir: dir.as_ref().to_path_buf(),
        }
    }

    pub fn default_dir() -> Result<PathBuf, RunnerError> {
        let dir = dirs::data_local_dir()
            .ok_or_else(|| RunnerError::Config("could not locate local data directory".into()))?
            .join("taskforge")
            .join("spool");
        Ok(dir)
    }

    pub fn from_default_dir() -> Result<Self, RunnerError> {
        let dir = Self::default_dir()?;
        fs::create_dir_all(&dir)?;
        Ok(Self::new(dir))
    }

    fn path_for(&self, session_id: &str) -> PathBuf {
        self.dir.join(format!("{}.ndjson", session_id))
    }

    pub fn append(
        &self,
        runner_id: &str,
        session_id: &str,
        seq: u64,
        event_type: &str,
        payload: Value,
    ) -> Result<(), RunnerError> {
        fs::create_dir_all(&self.dir)?;
        let event = SpooledEvent {
            runner_id: runner_id.to_string(),
            session_id: session_id.to_string(),
            seq,
            event_type: event_type.to_string(),
            payload,
        };
        let line = serde_json::to_string(&event)?;
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.path_for(session_id))?;
        writeln!(file, "{}", line)?;
        debug!("spooled event {}:{} {}", session_id, seq, event_type);
        Ok(())
    }

    pub async fn drain(&self, client: &PlatformClient) -> Result<usize, RunnerError> {
        let mut entries = fs::read_dir(&self.dir)?
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path()
                    .extension()
                    .map(|ext| ext == "ndjson")
                    .unwrap_or(false)
            })
            .collect::<Vec<_>>();
        entries.sort_by_key(|e| e.path());

        let mut total = 0usize;
        for entry in entries {
            let path = entry.path();
            let count = Self::drain_file(&path, client).await?;
            total += count;
            if count > 0 {
                info!("drained {} events from {:?}", count, path);
                fs::remove_file(&path)?;
            }
        }
        Ok(total)
    }

    async fn drain_file(path: &Path, client: &PlatformClient) -> Result<usize, RunnerError> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut count = 0usize;
        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }
            let event: SpooledEvent = serde_json::from_str(&line)?;
            match client
                .append_event(
                    &event.runner_id,
                    &event.session_id,
                    event.seq,
                    &event.event_type,
                    event.payload,
                )
                .await
            {
                Ok(()) => count += 1,
                Err(e) => {
                    error!("failed to replay spooled event: {}", e);
                    break;
                }
            }
        }
        Ok(count)
    }
}
