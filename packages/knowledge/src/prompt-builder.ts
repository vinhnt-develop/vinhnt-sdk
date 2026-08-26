import type { PromptAssembly, MemoryEntry } from "@vinhnt-sdk/schema";

/** Inputs assembled into the final prompt: identity, guidance, context and memory entries. */
export interface PromptBuilderOptions {
  readonly identity: string;
  readonly toolGuidance: string;
  readonly skillsIndex: string;
  readonly projectContext: string;
  readonly memoryEntries: MemoryEntry[];
  readonly sessionMetadata: string;
}

/** Build a stable+contextual {@link PromptAssembly} from the given options. */
export function buildPrompt(options: PromptBuilderOptions): PromptAssembly {
  const stable = [
    options.identity,
    options.toolGuidance,
    options.skillsIndex,
  ].filter(Boolean).join("\n\n");

  const context = [
    options.projectContext,
  ].filter(Boolean).join("\n\n");

  const volatileParts = [
    ...options.memoryEntries.map((e) => `[${e.tier}] ${e.key}:\n${e.value}`),
    options.sessionMetadata,
  ].filter(Boolean);

  const volatile = volatileParts.join("\n\n");

  const memoryBlock = volatile ? `<memory>\n${volatile}\n</memory>` : "";
  const assembled = [
    stable,
    context ? `<context>\n${context}\n</context>` : "",
    memoryBlock,
  ].filter(Boolean).join("\n\n");

  return { stable, context, volatile, assembled, version: "1.0.0", metadata: {} };
}
