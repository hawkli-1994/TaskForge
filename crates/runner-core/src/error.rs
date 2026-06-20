use thiserror::Error;

#[derive(Debug, Error)]
pub enum RunnerError {
    #[error("configuration error: {0}")]
    Config(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("platform API error: {status} {message}")]
    Platform { status: u16, message: String },

    #[error("authentication not configured")]
    NotAuthenticated,

    #[error("runner not registered")]
    NotRegistered,

    #[error("invalid local path: {0}")]
    InvalidLocalPath(String),

    #[error("binding validation failed: {0}")]
    BindingValidation(String),

    #[error("redaction denied: {0}")]
    RedactionDenied(String),

    #[error("agent host error: {0}")]
    AgentHost(String),

    #[error("spool error: {0}")]
    Spool(String),

    #[error("unknown error: {0}")]
    Unknown(String),
}

impl From<String> for RunnerError {
    fn from(value: String) -> Self {
        RunnerError::Unknown(value)
    }
}
