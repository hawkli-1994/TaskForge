import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export interface LlmConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface LlmClient {
  complete(system: string, user: string): Promise<string>;
}

export function loadLlmConfigFromEnv(): LlmConfig | undefined {
  const provider = process.env.LLM_PROVIDER;
  if (!provider) {
    return undefined;
  }
  if (provider !== "openai" && provider !== "anthropic") {
    throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
  }
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY is required when LLM_PROVIDER is set");
  }
  const model = process.env.LLM_MODEL ?? defaultModel(provider);
  const baseUrl = process.env.LLM_BASE_URL;
  return { provider, apiKey, model, baseUrl };
}

function defaultModel(provider: "openai" | "anthropic"): string {
  switch (provider) {
    case "openai":
      return "gpt-4o-mini";
    case "anthropic":
      return "claude-3-5-sonnet-20241022";
  }
}

export function createLlmClient(config: LlmConfig): LlmClient {
  switch (config.provider) {
    case "openai":
      return new OpenAiClient(config);
    case "anthropic":
      return new AnthropicClient(config);
  }
}

class OpenAiClient implements LlmClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: LlmConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model;
  }

  async complete(system: string, user: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty content");
    }
    return content;
  }
}

class AnthropicClient implements LlmClient {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: LlmConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model;
  }

  async complete(system: string, user: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.2,
    });
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Anthropic returned non-text content");
    }
    return content.text;
  }
}
