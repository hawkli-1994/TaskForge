use tracing::warn;

pub struct Redactor;

impl Redactor {
    pub fn new() -> Self {
        Self
    }

    /// Returns `true` if the provided path matches any of the denied patterns.
    /// Patterns are simple substring checks; a leading slash is normalized.
    pub fn check_path(&self, path: &str, denied_patterns: &[String]) -> bool {
        let normalized = path.replace('\\', "/");
        for pattern in denied_patterns {
            let pat = pattern.replace('\\', "/");
            if normalized.contains(&pat) {
                warn!("path {} matched denied pattern {}", path, pattern);
                return true;
            }
        }
        false
    }

    /// Naively masks likely secrets/tokens in free-form text.
    /// Looks for common key names and redacts the following value.
    pub fn mask_secrets(&self, text: &str) -> String {
        let mut result = text.to_string();
        let secret_keys = [
            "token",
            "api_key",
            "apikey",
            "api-key",
            "secret",
            "password",
            "passwd",
            "private_key",
            "Authorization",
            "bearer",
        ];

        for key in &secret_keys {
            // Case-insensitive JSON/TOML style: "key": "value" or key = value
            let marker = format!("\"{}\"", key);
            if let Some(start) = result.to_lowercase().find(&marker.to_lowercase())
                && let Some(end) = result[start + marker.len()..].find('\n')
            {
                let line = &result[start..start + marker.len() + end];
                if let Some(value_start) = line.find(':').or_else(|| line.find('=')) {
                    let value = &line[value_start + 1..];
                    let trimmed = value.trim();
                    if !trimmed.is_empty() {
                        result.replace_range(
                            start + marker.len() + value_start + 1..start + marker.len() + end,
                            " ***REDACTED***",
                        );
                    }
                }
            }
        }

        // Mask standalone bearer tokens in Authorization headers.
        result = result
            .replace("Bearer ", "Bearer ***REDACTED***")
            .replace("bearer ", "bearer ***REDACTED***");

        result
    }
}

impl Default for Redactor {
    fn default() -> Self {
        Self::new()
    }
}
