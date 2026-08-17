import type { LspDiagnostic } from "./types.js";

/** Cached diagnostics for one file with a monotonically increasing version. */
export interface StoredDiagnostics {
  uri: string;
  diagnostics: LspDiagnostic[];
  updatedAt: number;
  version: number;
}

/** In-memory store of per-uri diagnostics with waitFor support. */
export class DiagnosticStore {
  private store = new Map<string, StoredDiagnostics>();
  private waiting = new Map<string, Array<() => void>>();

  set(uri: string, diagnostics: LspDiagnostic[]): void {
    const previous = this.store.get(uri);
    const entry: StoredDiagnostics = {
      uri, diagnostics, updatedAt: Date.now(),
      version: (previous?.version ?? 0) + 1,
    };
    this.store.set(uri, entry);

    const resolvers = this.waiting.get(uri);
    if (resolvers) {
      this.waiting.delete(uri);
      for (const resolve of resolvers) {
        resolve();
      }
    }
  }

  /** Current version for a uri (0 when never updated) */
  version(uri: string): number {
    return this.store.get(uri)?.version ?? 0;
  }

  get(uri: string): StoredDiagnostics | undefined {
    return this.store.get(uri);
  }

  getAll(): StoredDiagnostics[] {
    return Array.from(this.store.values());
  }

  clear(uri: string): void {
    this.store.delete(uri);
  }

  clearAll(): void {
    this.store.clear();
    for (const [, resolvers] of this.waiting) {
      for (const resolve of resolvers) resolve();
    }
    this.waiting.clear();
  }

  async waitForDiagnostics(uri: string, timeoutMs: number, sinceVersion = 0): Promise<LspDiagnostic[]> {
    const existing = this.store.get(uri);
    if (existing && existing.version > sinceVersion) return existing.diagnostics;

    return new Promise<LspDiagnostic[]>((resolve, _reject) => {
      const timer = setTimeout(() => {
        const resolvers = this.waiting.get(uri);
        if (resolvers) {
          const idx = resolvers.indexOf(outerResolve);
          if (idx !== -1) resolvers.splice(idx, 1);
        }
        const stored = this.store.get(uri);
        resolve(stored?.diagnostics ?? []);
      }, timeoutMs);

      const outerResolve = () => {
        clearTimeout(timer);
        resolve(this.store.get(uri)?.diagnostics ?? []);
      };

      const resolvers = this.waiting.get(uri) ?? [];
      resolvers.push(outerResolve);
      if (resolvers.length === 1) {
        this.waiting.set(uri, resolvers);
      }
    });
  }
}

const SEVERITY_LABELS: Record<number, string> = {
  1: "ERROR",
  2: "WARN",
  3: "INFO",
  4: "HINT",
};

/** Format a single diagnostic as `SEVERITY [line:col] message`. */
export function formatDiagnostic(d: LspDiagnostic): string {
  const sev = SEVERITY_LABELS[d.severity ?? 4] ?? "UNKN";
  const line = d.range.start.line + 1;
  const col = d.range.start.character + 1;
  return `${sev} [${line}:${col}] ${d.message}`;
}

/** Format diagnostics grouped into Errors/Warnings/Other sections. */
export function formatDiagnostics(diagnostics: LspDiagnostic[]): string {
  if (diagnostics.length === 0) return "";
  const errors = diagnostics.filter((d) => d.severity === 1);
  const warnings = diagnostics.filter((d) => d.severity === 2);
  const others = diagnostics.filter((d) => d.severity !== 1 && d.severity !== 2);

  const parts: string[] = [];
  if (errors.length > 0) {
    parts.push(`\n## Errors (${errors.length})`);
    for (const d of errors) parts.push(`- ${formatDiagnostic(d)}`);
  }
  if (warnings.length > 0) {
    parts.push(`\n## Warnings (${warnings.length})`);
    for (const d of warnings) parts.push(`- ${formatDiagnostic(d)}`);
  }
  if (others.length > 0) {
    parts.push(`\n## Other (${others.length})`);
    for (const d of others) parts.push(`- ${formatDiagnostic(d)}`);
  }
  return parts.join("\n");
}

/** Count diagnostics with severity ERROR (1). */
export function countErrors(diagnostics: LspDiagnostic[]): number {
  return diagnostics.filter((d) => d.severity === 1).length;
}

/** Count diagnostics with severity WARN (2). */
export function countWarnings(diagnostics: LspDiagnostic[]): number {
  return diagnostics.filter((d) => d.severity === 2).length;
}
