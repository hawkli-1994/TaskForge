use crate::error::RunnerError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tracing::{info, warn};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthData {
    pub token: Option<String>,
    pub runner_id: Option<String>,
}

pub struct AuthStore {
    path: PathBuf,
}

impl AuthStore {
    pub fn new(path: impl AsRef<Path>) -> Self {
        Self {
            path: path.as_ref().to_path_buf(),
        }
    }

    pub fn from_config_dir() -> Result<Self, RunnerError> {
        let dir = crate::config::RunnerConfig::config_dir()?;
        Ok(Self::new(dir.join("auth.json")))
    }

    pub fn save(&self, token: Option<&str>, runner_id: Option<&str>) -> Result<(), RunnerError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let data = AuthData {
            token: token.map(|s| s.to_string()),
            runner_id: runner_id.map(|s| s.to_string()),
        };
        let contents = serde_json::to_string_pretty(&data)?;
        fs::write(&self.path, contents)?;
        info!("saved auth data to {:?}", self.path);
        Ok(())
    }

    pub fn load(&self) -> Result<AuthData, RunnerError> {
        if !self.path.exists() {
            return Ok(AuthData::default());
        }
        let contents = fs::read_to_string(&self.path)?;
        let data: AuthData = serde_json::from_str(&contents).map_err(RunnerError::Serialization)?;
        Ok(data)
    }

    pub fn clear(&self) -> Result<(), RunnerError> {
        if self.path.exists() {
            fs::remove_file(&self.path)?;
            info!("cleared auth data at {:?}", self.path);
        } else {
            warn!("no auth data found at {:?}", self.path);
        }
        Ok(())
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}
