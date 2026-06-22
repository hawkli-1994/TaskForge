import { loadLlmConfigFromEnv, createLlmClient } from "./llm";
import type { PiAgentConfig } from "./resolver";

export function loadPiAgentConfigFromEnv(): PiAgentConfig {
  const llmConfig = loadLlmConfigFromEnv();
  return {
    ...(llmConfig ? { llm: { client: createLlmClient(llmConfig) } } : {}),
    ...(process.env.GITHUB_TOKEN ? { github: { token: process.env.GITHUB_TOKEN } } : {}),
    ...(process.env.GITLAB_API_TOKEN
      ? {
          gitlab: {
            token: process.env.GITLAB_API_TOKEN,
            baseUrl: process.env.GITLAB_BASE_URL,
          },
        }
      : {}),
  };
}

export { type PiAgentConfig };
