import { readFileSync } from "node:fs";
import type { ToolHook } from "@vinhnt-sdk/tools";
import type { FileHistory } from "./file-history.js";

export function createFileHistoryHook(fileHistory: FileHistory): ToolHook {
  const pending = new Map<string, { filePath: string; originalContent: string }>();

  return {
    id: "file-history",
    async pre(params) {
      if (params.tool.id !== "write_file" && params.tool.id !== "edit_file") return null;
      const input = params.input as Record<string, unknown> | undefined;
      if (!input) return null;

      const filePath = (input.filePath ?? input.path ?? input.dirPath) as string | undefined;
      if (!filePath) return null;

      let originalContent = "";
      try {
        originalContent = readFileSync(filePath, "utf-8");
      } catch {
        originalContent = "";
      }

      pending.set(params.toolId, { filePath, originalContent });
      return null;
    },
    async post(params) {
      if (params.result.status !== "success") {
        pending.delete(params.toolId);
        return null;
      }
      if (params.tool.id !== "write_file" && params.tool.id !== "edit_file") {
        pending.delete(params.toolId);
        return null;
      }

      const output = params.result.output as Record<string, unknown> | undefined;
      const filePath = (output?.written ?? output?.edited) as string | undefined;
      if (!filePath) {
        pending.delete(params.toolId);
        return null;
      }

      let originalContent = "";
      let newContent = "";
      try {
        newContent = readFileSync(filePath, "utf-8");
      } catch { /* file may have been deleted */ }

      const p = pending.get(params.toolId);
      if (p) {
        originalContent = p.originalContent;
      }
      pending.delete(params.toolId);

      await fileHistory.recordVersion({
        filePath,
        sessionId: "",
        originalContent,
        newContent,
        toolName: params.tool.id,
      }).catch(() => {});

      return null;
    },
  };
}
