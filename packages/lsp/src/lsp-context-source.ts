import type { ContextSourceValue, ContextSourceKey } from "@vinhnt-sdk/agent-core";
import type { LspPool } from "./pool.js";
import { formatDiagnostics } from "./diagnostics.js";

export interface LspContext {
  activeServers: number;
  serverList: { id: string; language: string; root: string }[];
  diagnosticSummary: string;
  errorCount: number;
  warningCount: number;
}

export function createLspContextSource(pool: LspPool): ContextSourceValue<LspContext> {
  return {
    key: "lsp.status" as ContextSourceKey,
    priority: 30,
    async load() {
      const statuses = pool.getStatus();
      const allDiagnostics = pool.diagnostics.getAll();
      let errorCount = 0;
      let warningCount = 0;
      const lines: string[] = [];

      for (const stored of allDiagnostics) {
        for (const d of stored.diagnostics) {
          if (d.severity === 1) errorCount++;
          else if (d.severity === 2) warningCount++;
        }
        const file = pathFromUri(stored.uri);
        if (stored.diagnostics.length > 0) {
          lines.push(`### ${file}`);
          lines.push(formatDiagnostics(stored.diagnostics));
        }
      }

      return {
        activeServers: statuses.length,
        serverList: statuses.map((s) => ({
          id: s.id,
          language: s.languageId,
          root: s.root,
        })),
        diagnosticSummary: lines.join("\n"),
        errorCount,
        warningCount,
      };
    },
    renderBaseline(value) {
      const parts: string[] = ["## Language Server Status"];
      parts.push(`- Active servers: ${value.activeServers}`);
      for (const s of value.serverList) {
        parts.push(`  - ${s.language} (${s.id}) — root: \`${s.root}\``);
      }
      if (value.errorCount > 0 || value.warningCount > 0) {
        parts.push(`- Diagnostics: ${value.errorCount} errors, ${value.warningCount} warnings`);
        if (value.diagnosticSummary) {
          parts.push("\n" + value.diagnosticSummary);
        }
      } else {
        parts.push("- No diagnostics");
      }
      return parts.join("\n");
    },
    renderUpdate(value, previous) {
      const changes: string[] = [];
      if (value.errorCount !== previous.errorCount || value.warningCount !== previous.warningCount) {
        changes.push(`Diagnostics updated: ${value.errorCount} errors, ${value.warningCount} warnings (was ${previous.errorCount}/${previous.warningCount})`);
      }
      if (value.activeServers !== previous.activeServers) {
        changes.push(`LSP servers: ${value.activeServers} active (was ${previous.activeServers})`);
      }
      if (changes.length === 0) return null;
      return "[LSP update]\n" + changes.join("\n");
    },
    renderRemoval() {
      return "";
    },
  };
}

function pathFromUri(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const match = decoded.match(/^file:\/\/(?:\/([a-zA-Z]:))?(.*)$/);
  if (match) {
    const drive = match[1] as string | undefined;
    const absPath = match[2] ?? "";
    return drive ? `${drive}${absPath}` : absPath;
  }
  return decoded.replace(/^file:\/\//, "");
}
