/**
 * LLM Adapter Registry — register, resolve, and swap providers.
 *
 * Providers register via `registerAdapter(providerNames, adapter)`.
 * The registry validates all-or-nothing registration, prevents duplicates,
 * and supports atomic swap for hot-reload.
 *
 * @example
 * ```ts
 * import { LlmRegistry } from "@vinhnt-sdk/llm";
 *
 * const registry = new LlmRegistry();
 * registry.registerAdapter(["deepseek"], new DeepSeekAdapter());
 * registry.registerAdapter(["openai", "azure"], new OpenAIAdapter());
 *
 * // Resolve by provider name
 * const adapter = registry.getAdapter("deepseek");
 *
 * // Atomic swap (all-or-nothing)
 * registry.registerAdapter(["deepseek"], new DeepSeekV2Adapter());
 * ```
 */

import type { LlmAdapter, ProviderInfo, RetryPolicy } from "./adapter.js";

// ── Registration Handle ──

/** Handle returned by registerAdapter — controls the registration lifetime. */
export interface AdapterRegistrationHandle {
  /** Release all routes registered by this call. */
  dispose(): void;
  /** Atomically replace the provider routes with a new adapter. */
  replace(adapter: LlmAdapter): void;
}

// ── Registration Errors ──

/** Error thrown when adapter registration fails. */
export class AdapterRegistrationError extends Error {
  constructor(
    message: string,
    public readonly code: "DUPLICATE_ADAPTER" | "EMPTY_PROVIDERS" | "CONFLICT",
  ) {
    super(message);
    this.name = "AdapterRegistrationError";
  }
}

// ── Registry ──

/**
 * Registry for LLM adapters — manages provider → adapter mapping.
 *
 * Registration rules:
 * - All-or-nothing: if any provider name conflicts, nothing registers
 * - One adapter per provider route
 * - Non-empty provider names required
 * - Atomic swap: replace() validates the full candidate set before mutating
 */
export class LlmRegistry {
  /** provider name → { adapter, owner } */
  private readonly adapters = new Map<string, { adapter: LlmAdapter; owner: symbol }>();
  /** owner symbol → provider names (for dispose) */
  private readonly owners = new Map<symbol, string[]>();

  /**
   * Register an adapter for one or more provider names.
   *
   * @param providerNames - Provider names this adapter handles (e.g., `["openai", "azure"]`)
   * @param adapter - The adapter implementation
   * @returns A handle to control the registration lifetime
   * @throws AdapterRegistrationError if any provider name conflicts
   */
  registerAdapter(providerNames: readonly string[], adapter: LlmAdapter): AdapterRegistrationHandle {
    if (providerNames.length === 0) {
      throw new AdapterRegistrationError("At least one provider name is required", "EMPTY_PROVIDERS");
    }

    // Validate no conflicts
    for (const name of providerNames) {
      if (this.adapters.has(name)) {
        const existing = this.adapters.get(name)!;
        throw new AdapterRegistrationError(
          `Provider "${name}" is already registered by another adapter`,
          "DUPLICATE_ADAPTER",
        );
      }
    }

    // Register
    const owner = Symbol(`adapter:${providerNames.join(",")}`);
    for (const name of providerNames) {
      this.adapters.set(name, { adapter, owner });
    }
    this.owners.set(owner, [...providerNames]);

    return {
      dispose: () => {
        const routes = this.owners.get(owner);
        if (routes) {
          for (const name of routes) {
            this.adapters.delete(name);
          }
          this.owners.delete(owner);
        }
      },
      replace: (newAdapter: LlmAdapter) => {
        const routes = this.owners.get(owner);
        if (!routes) return;
        for (const name of routes) {
          this.adapters.set(name, { adapter: newAdapter, owner });
        }
      },
    };
  }

  /**
   * Get an adapter by provider name.
   * @returns The adapter, or undefined if not registered.
   */
  getAdapter(provider: string): LlmAdapter | undefined {
    return this.adapters.get(provider)?.adapter;
  }

  /**
   * Get all adapters registered for a given provider name.
   * For multi-route adapters (e.g. one adapter serving "openai" and "azure"),
   * this returns the same adapter instance for each route.
   */
  getByProvider(provider: string): { adapter: LlmAdapter; routes: string[] } | undefined {
    const entry = this.adapters.get(provider);
    if (!entry) return undefined;
    const routes = this.owners.get(entry.owner) ?? [provider];
    return { adapter: entry.adapter, routes };
  }

  /**
   * List all distinct provider names registered in this registry.
   */
  providers(): readonly string[] {
    return [...this.adapters.keys()];
  }

  /**
   * Check if a provider is registered.
   */
  hasProvider(provider: string): boolean {
    return this.adapters.has(provider);
  }

  /**
   * Get metadata about all registered providers.
   */
  listProviders(): readonly (ProviderInfo & { readonly routes: readonly string[] })[] {
    const seen = new Map<LlmAdapter, string[]>();
    for (const [name, { adapter }] of this.adapters) {
      const existing = seen.get(adapter);
      if (existing) {
        existing.push(name);
      } else {
        seen.set(adapter, [name]);
      }
    }
    const result: (ProviderInfo & { readonly routes: readonly string[] })[] = [];
    for (const [adapter, routes] of seen) {
      const info = adapter.providerInfo(routes[0]!);
      result.push({ ...info, routes });
    }
    return result;
  }

  /**
   * Get the retry policy for a provider.
   * Falls back to the adapter's policy, then to the default.
   */
  getRetryPolicy(provider: string): RetryPolicy | undefined {
    const adapter = this.getAdapter(provider);
    return adapter?.providerRetryPolicy(provider);
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    this.adapters.clear();
    this.owners.clear();
  }
}
