import type { ToolHook } from "@vinhnt-sdk/agent-core";
import type { LspPool } from "./pool.js";
import { formatDiagnostics } from "./diagnostics.js";
import { uriFromPath } from "./file-sync.js";

type RootGetter = string | (() => string);

function resolveRoot(r: RootGetter): string {
  return typeof r === "function" ? r() : r;
}

const LSP_AWARE_TOOLS = new Set(["read_file", "write_file", "edit_file"]);

export function createLspToolHook(pool: LspPool, workspaceRoot: RootGetter): ToolHook {
  return {
    id: "lsp-hooks",

    async post(params) {
      if (!LSP_AWARE_TOOLS.has(params.toolId)) return null;
      if (params.result.status !== "success") return null;

      const input = params.input as { path?: string; filePath?: string; content?: string };
      const filePath = input.path ?? input.filePath;
      if (!filePath) return null;

      const root = resolveRoot(workspaceRoot);
      const absolutePath = filePath.startsWith("/") || filePath.match(/^[a-zA-Z]:/) 
        ? filePath 
        : `${root.replace(/\\/g, "/")}/${filePath}`;

      const diagnostics = await notifyPool(pool, absolutePath, params.toolId, input.content);
      if (!diagnostics || diagnostics.length === 0) return null;

      const summary = formatDiagnostics(diagnostics);
      const output = params.result.output;

      if (typeof output === "string") {
        return {
          status: "success" as const,
          output: `${output}\n\n--- Diagnostics ---\n${summary}`,
        };
      }

      if (typeof output === "object" && output !== null) {
        return {
          status: "success" as const,
          output: { ...(output as Record<string, unknown>), diagnostics: summary },
        };
      }

      return null;
    },
  };
}

async function notifyPool(
  pool: LspPool,
  absolutePath: string,
  toolId: string,
  content?: string,
): Promise<ReturnType<typeof pool.getDiagnostics>> {
  const client = await pool.getOrStart(absolutePath);
  if (!client) return [];

  if (toolId === "read_file") {
    return pool.getDiagnostics(absolutePath);
  }

  if (content !== undefined) {
    const sinceVersion = pool.diagnosticsVersion(absolutePath);
    notifyChange(pool, absolutePath, content);
    // Wait for the server to publish a NEW diagnostic version after the change,
    // instead of sleeping a fixed 200ms (R5/2.5).
    return pool.waitAndGetDiagnostics(absolutePath, sinceVersion);
  }

  return pool.waitAndGetDiagnostics(absolutePath);
}

export function notifyChange(pool: LspPool, filePath: string, content: string): void {
  pool.getOrStart(filePath).then((c) => {
    if (c) {
      c.changeFile(uriFromPath(filePath), content);
    }
  }).catch(() => {});
}
