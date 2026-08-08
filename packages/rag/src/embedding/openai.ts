import type { EmbeddingConfig, EmbeddingProvider, EmbeddingResult } from "./types.js";

/** Default OpenAI embedding models. */
const OPENAI_MODELS = {
  small: "text-embedding-3-small",
  large: "text-embedding-3-large",
} as const;

/**
 * OpenAI embedding provider.
 * Supports text-embedding-3-small and text-embedding-3-large.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimensions: number;
  private readonly baseUrl: string;

  constructor(config: EmbeddingConfig) {
    if (!config.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = config.apiKey;
    this.model = config.model ?? OPENAI_MODELS.small;
    this.dimensions = config.dimensions ?? 1536;
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
  }

  async embed(
    text: string,
    inputType: "document" | "query" = "document",
  ): Promise<EmbeddingResult> {
    const results = await this.embedBatch([text], inputType);
    const first = results[0];
    if (!first) {
      throw new Error("No embedding result returned");
    }
    return first;
  }

  async embedBatch(
    texts: string[],
    inputType: "document" | "query" = "document",
  ): Promise<EmbeddingResult[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding failed: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      usage: { prompt_tokens: number; total_tokens: number };
    };

    // Sort by index to maintain order
    const sorted = data.data.sort((a, b) => a.index - b.index);
    const tokensPerText = Math.ceil(data.usage.prompt_tokens / texts.length);

    return sorted.map((item) => ({
      embedding: item.embedding,
      tokenCount: tokensPerText,
    }));
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
