use crate::error::RunnerError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerConfig {
    #[serde(default = "default_api_url")]
    pub api_url: String,

    pub token: Option<String>,
    pub runner_id: Option<String>,
    pub project_id: Option<String>,
    pub agent_command: Option<String>,

    #[serde(default)]
    pub denied_paths: Vec<String>,

    #[serde(default)]
    pub allowed_commands: Vec<String>,

    #[serde(default)]
    pub local_bindings: Vec<LocalBinding>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LocalBinding {
    pub repository_id: String,
    pub local_path: String,
}

fn default_api_url() -> String {
    "http://localhost:3001/api".to_string()
}

impl Default for RunnerConfig {
    fn default() -> Self {
        Self {
            api_url: default_api_url(),
            token: None,
            runner_id: None,
            project_id: None,
            agent_command: None,
            denied_paths: Vec::new(),
            allowed_commands: Vec::new(),
            local_bindings: Vec::new(),
        }
    }
}

impl RunnerConfig {
    pub fn config_dir() -> Result<PathBuf, RunnerError> {
        let dir = dirs::config_dir()
            .ok_or_else(|| RunnerError::Config("could not locate config directory".into()))?
            .join("taskforge");
        Ok(dir)
    }

    pub fn config_path() -> Result<PathBuf, RunnerError> {
        Ok(Self::config_dir()?.join("runner.toml"))
    }

    pub fn load() -> Result<Self, RunnerError> {
        let path = Self::config_path()?;
        let mut config = if !path.exists() {
            info!("runner config not found at {:?}, using defaults", path);
            RunnerConfig::default()
        } else {
            let contents = fs::read_to_string(&path)?;
            toml::from_str(&contents)
                .map_err(|e| RunnerError::Config(format!("failed to parse {:?}: {}", path, e)))?
        };

        if let Ok(env_url) = std::env::var("TASKFORGE_API_URL")
            && !env_url.is_empty()
        {
            config.api_url = env_url;
        }

        Ok(config)
    }

    pub fn save(&self) -> Result<(), RunnerError> {
        let path = Self::config_path()?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let contents = toml::to_string_pretty(self)
            .map_err(|e| RunnerError::Config(format!("failed to serialize config: {}", e)))?;
        fs::write(&path, contents)?;
        info!("saved runner config to {:?}", path);
        Ok(())
    }

    pub fn upsert_binding(&mut self, repository_id: String, local_path: String) {
        if let Some(existing) = self
            .local_bindings
            .iter_mut()
            .find(|b| b.repository_id == repository_id)
        {
            existing.local_path = local_path;
        } else {
            self.local_bindings.push(LocalBinding {
                repository_id,
                local_path,
            });
        }
    }

    pub fn binding_for_repo(&self, repository_id: &str) -> Option<&LocalBinding> {
        self.local_bindings
            .iter()
            .find(|b| b.repository_id == repository_id)
    }

    pub fn ensure_config_dir() -> Result<PathBuf, RunnerError> {
        let dir = Self::config_dir()?;
        fs::create_dir_all(&dir)?;
        Ok(dir)
    }

    pub fn exists() -> Result<bool, RunnerError> {
        Ok(Self::config_path()?.exists())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_api_url_matches_expectation() {
        let cfg = RunnerConfig::default();
        assert_eq!(cfg.api_url, "http://localhost:3001/api");
    }
}
