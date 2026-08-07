export interface ProviderCapabilities {
  streaming: boolean;
  tools: boolean;
  thinking: boolean;
  vision: boolean;
  systemPrompt: boolean;
}

export const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  streaming: true,
  tools: true,
  thinking: false,
  vision: true,
  systemPrompt: true,
};

export const PROVIDER_CAPABILITIES: Record<string, Partial<ProviderCapabilities>> = {
  openai:     {},
  anthropic:  { thinking: true },
  gemini:     { vision: true },
  groq:       { tools: true },
  mistral:    {},
  together:   {},
  deepseek:   {},
  perplexity: { tools: false, vision: false },
  replicate:  { tools: false },
  cohere:     {},
  openrouter: {},
  ollama:     { vision: false },
};

export function getCapabilities(providerName: string): ProviderCapabilities {
  const overrides = PROVIDER_CAPABILITIES[providerName] ?? {};
  return { ...DEFAULT_CAPABILITIES, ...overrides };
}

export interface ProviderFeature {
  name: string;
  label: string;
  supported: boolean;
}

export function listFeatures(providerName: string): ProviderFeature[] {
  const caps = getCapabilities(providerName);
  return [
    { name: "streaming", label: "Streaming", supported: caps.streaming },
    { name: "tools", label: "Tool Calling", supported: caps.tools },
    { name: "thinking", label: "Thinking/Reasoning", supported: caps.thinking },
    { name: "vision", label: "Vision (Image Input)", supported: caps.vision },
    { name: "systemPrompt", label: "System Prompt", supported: caps.systemPrompt },
  ];
}
