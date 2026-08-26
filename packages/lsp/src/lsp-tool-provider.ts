import type { ToolProvider, ToolDefinition, ToolRegistry } from "@vinhnt-sdk/tools";
import type { LspPool } from "./pool.js";
import { createLspTools } from "./lsp-tools.js";

/**
 * LspToolProvider — Provides LSP tools.
 *
 * This is a ToolProvider implementation that can be registered with
 * the core package's ToolProviderRegistry.
 */
export class LspToolProvider implements ToolProvider {
  readonly id = "lsp";
  readonly name = "LSP Tools";
  readonly description = "Language Server Protocol tools for code intelligence";

  private pool: LspPool;
  private _tools: ToolDefinition[] = [];

  constructor(pool: LspPool) {
    this.pool = pool;
    this._tools = createLspTools(pool);
  }

  get tools(): ToolDefinition[] {
    return this._tools;
  }

  register(_registry: ToolRegistry): void {
    // Registration is handled by ToolProviderRegistry
  }

  unregister(_registry: ToolRegistry): void {
    this._tools = [];
  }
}
