import type { EmbeddingConfig, EmbeddingProvider, EmbeddingResult } from "./types.js";

/** Default Voyage AI embedding models. */
const VOYAGE_MODELS = {
  code: "voyage-code-3",
  general: "voyage-3",
} as const;

/**
 * Voyage AI embedding provider.
 * Best for code retrieval (voyage-code-3 scores 71.4 on code benchmarks).
 */
export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly name = "voyage";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(config: EmbeddingConfig) {
    if (!config.apiKey) {
      throw new Error("Voyage API key is required");
    }
    this.apiKey = config.apiKey;
    this.model = config.model ?? VOYAGE_MODELS.code;
    this.dimensions = config.dimensions ?? 1024;
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
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        input_type: inputType,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage embedding failed: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      usage: { total_tokens: number };
    };

    const sorted = data.data.sort((a, b) => a.index - b.index);
    const tokensPerText = Math.ceil(data.usage.total_tokens / texts.length);

    return sorted.map((item) => ({
      embedding: item.embedding,
      tokenCount: tokensPerText,
    }));
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
