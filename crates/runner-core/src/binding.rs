use crate::config::RunnerConfig;
use crate::error::RunnerError;
use std::path::Path;
use std::process::Command;
use tracing::{info, warn};

pub struct LocalBindingStore;

impl LocalBindingStore {
    pub fn new() -> Self {
        Self
    }

    /// Validate that `local_path` exists on disk and that its git remote
    /// matches the platform repository URL. For v0.1 the git remote check is a
    /// stub that only verifies the path is inside a git repository.
    pub fn validate(
        &self,
        repository_id: &str,
        local_path: &str,
        _platform_repo_url: Option<&str>,
    ) -> Result<(), RunnerError> {
        let path = Path::new(local_path);
        if !path.exists() {
            return Err(RunnerError::InvalidLocalPath(format!(
                "path does not exist: {}",
                local_path
            )));
        }
        if !path.is_dir() {
            return Err(RunnerError::InvalidLocalPath(format!(
                "path is not a directory: {}",
                local_path
            )));
        }

        // Stub git remote validation: ensure `git rev-parse --git-dir` succeeds.
        match Command::new("git")
            .arg("rev-parse")
            .arg("--git-dir")
            .current_dir(path)
            .output()
        {
            Ok(output) if output.status.success() => {
                info!(
                    "validated git repository for {} at {}",
                    repository_id, local_path
                );
            }
            _ => {
                warn!(
                    "{} does not appear to be a git repository; binding anyway for v0.1 stub",
                    local_path
                );
            }
        }

        Ok(())
    }

    /// Stub: fetch the canonical clone URL for a repository from the platform.
    pub fn platform_url_for_repo(
        &self,
        _config: &RunnerConfig,
        repository_id: &str,
    ) -> Option<String> {
        // v0.1 stub: assume repositories live at `${api_url}/repositories/{id}`.
        Some(format!(
            "https://taskforge.example/repositories/{}",
            repository_id
        ))
    }
}

impl Default for LocalBindingStore {
    fn default() -> Self {
        Self::new()
    }
}
