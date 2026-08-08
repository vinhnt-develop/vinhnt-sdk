import type { ToolDefinition } from "@vinhnt-sdk/core";
import type { ToolContext } from "@vinhnt-sdk/core";
import type { LspPool } from "./pool.js";
import type { LspDocumentSymbol, LspRange } from "./types.js";
import { formatDiagnostics, countErrors } from "./diagnostics.js";
import { pathToUri } from "./file-sync.js";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/core";

const LspDiagnosticsSchema = z.object({
  filePath: z.string().min(1),
});
const LspSymbolsSchema = z.object({
  filePath: z.string().min(1),
});
const LspPositionSchema = z.object({
  filePath: z.string().min(1),
  line: z.number().int().nonnegative(),
  character: z.number().int().nonnegative(),
});

const PATH_SCHEMA = {
  type: "object",
  properties: {
    path: { type: "string", description: "File path" },
  },
  required: ["path"],
} as const;

const QUERY_SCHEMA = {
  type: "object",
  properties: {
    query: { type: "string", description: "Search query for symbol name" },
  },
  required: ["query"],
} as const;

const POSITION_SCHEMA = {
  type: "object",
  properties: {
    path: { type: "string", description: "File path" },
    line: { type: "number", description: "Line number (1-based)" },
    column: { type: "number", description: "Column number (1-based)" },
  },
  required: ["path", "line", "column"],
} as const;

function normalizeInput(input: unknown): Record<string, unknown> {
  const v = input as Record<string, unknown> | null | undefined;
  if (!v || typeof v !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(v)) {
    result[key] = value;
  }
  if (!v.filePath && v.path && typeof v.path === "string") {
    result.filePath = v.path;
  }
  if (!v.filePath && v.query && typeof v.query === "string") {
    result.filePath = v.query;
  }
  if (!v.character && v.column !== undefined && typeof v.column === "number") {
    result.character = v.column;
  }
  return result;
}

const FILE_PROTOCOL_RE = /^file:\/\//i;

/** Roughly map a LSP languageId to a file extension (used for dummy query targets) */
function extForLanguage(languageId: string): string {
  switch (languageId) {
    case "typescript": return ".ts";
    case "javascript": return ".js";
    case "python": return ".py";
    case "rust": return ".rs";
    case "go": return ".go";
    case "java": return ".java";
    case "ruby": return ".rb";
    case "php": return ".php";
    case "dart": return ".dart";
    case "kotlin": return ".kt";
    case "swift": return ".swift";
    case "scala": return ".scala";
    case "zig": return ".zig";
    case "cpp": return ".cpp";
    case "css": return ".css";
    case "html": return ".html";
    case "json": return ".json";
    case "yaml": return ".yaml";
    case "toml": return ".toml";
    case "vue": return ".vue";
    case "svelte": return ".svelte";
    default: return `.${languageId}`;
  }
}

/** Return the extension of a query string (e.g. "getUser.ts" → ".ts") */
function extensionFromQuery(query: string): string {
  const base = query.replace(/\\/g, "/").split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot) : "";
}

/** Check whether a server languageId plausibly handles a target extension */
function serverSupportsExtension(languageId: string, ext: string): boolean {
  const candidate = extForLanguage(languageId);
  return candidate === ext || candidate.endsWith(ext) || ext.endsWith(candidate);
}

function uriToPath(uri: string): string {
  try {
    if (FILE_PROTOCOL_RE.test(uri)) return fileURLToPath(uri);
  } catch { /* fall through */ }
  return uri;
}

export function createLspDiagnosticsTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string }, unknown>({
    name: "lsp_diagnostics",
    description: "Get code diagnostics (errors, warnings) for a file. Returns structured list of all problems found by the language server.",
    risk: "read",
    input: LspDiagnosticsSchema,
    normalize: normalizeInput,
    jsonSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path to check for diagnostics",
        },
      },
      required: ["path"],
    },
    async execute(v, _ctx: ToolContext) {
      const diagnostics = await pool.getDiagnostics(v.filePath);
      return {
        path: v.filePath,
        errorCount: countErrors(diagnostics),
        diagnostics: diagnostics.map((d) => ({
          severity: d.severity === 1 ? "error" : d.severity === 2 ? "warning" : "info",
          line: d.range.start.line + 1,
          column: d.range.start.character + 1,
          message: d.message,
          source: d.source,
          code: d.code,
        })),
        summary: formatDiagnostics(diagnostics),
      };
    },
  }).toDefinition();
}

export function createLspSymbolsTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string }, unknown>({
    name: "lsp_symbols",
    description: "Search for symbols (classes, functions, methods, interfaces) across the workspace. Returns matching symbol names and locations.",
    risk: "read",
    input: LspSymbolsSchema,
    normalize: normalizeInput,
    jsonSchema: QUERY_SCHEMA,
    async execute(v, _ctx: ToolContext) {
      const query = v.filePath;
      const results: Array<{ name: string; kind: string; file: string; line: number }> = [];

      // Only query running servers whose language already matches the query target.
      // Avoids starting dummy clients for every connected server (R5).
      for (const status of pool.getStatus()) {
        if (!status.connected) continue;
        const targetExt = extensionFromQuery(query);
        if (targetExt && !serverSupportsExtension(status.languageId, targetExt)) continue;

        const client = await pool.getOrStart(status.root + "/query-target" + extForLanguage(status.languageId));
        if (!client) continue;

        const symbols = await client.getSymbols(query);
        for (const sym of symbols) {
          results.push({
            name: sym.name,
            kind: symbolKindToString(sym.kind),
            file: uriToPath(sym.location.uri),
            line: sym.location.range.start.line + 1,
          });
        }
      }

      return { query, results };
    },
  }).toDefinition();
}

export function createLspHoverTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string; line: number; character: number }, unknown>({
    name: "lsp_hover",
    description: "Get type information and documentation for a symbol at a specific position in a file.",
    risk: "read",
    input: LspPositionSchema,
    normalize: normalizeInput,
    jsonSchema: POSITION_SCHEMA,
    async execute(v, _ctx: ToolContext) {
      const client = await pool.getOrStart(v.filePath);
      if (!client) return { error: `No LSP server available for ${v.filePath}` };

      const result = await client.getHover(pathToUri(v.filePath), {
        line: v.line - 1,
        character: v.character - 1,
      });
      if (!result) return { contents: null };

      let contents = "";
      if (typeof result.contents === "string") {
        contents = result.contents;
      } else if ("language" in result.contents) {
        contents = `\`\`\`${result.contents.language}\n${result.contents.value}\n\`\`\``;
      } else if ("kind" in result.contents) {
        contents = result.contents.value;
      }

      return { path: v.filePath, line: v.line, column: v.character, contents };
    },
  }).toDefinition();
}

export function createLspDefinitionTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string; line: number; character: number }, unknown>({
    name: "lsp_definition",
    description: "Find the definition location of a symbol at a specific position in a file.",
    risk: "read",
    input: LspPositionSchema,
    normalize: normalizeInput,
    jsonSchema: POSITION_SCHEMA,
    async execute(v, _ctx: ToolContext) {
      const client = await pool.getOrStart(v.filePath);
      if (!client) return { error: `No LSP server available for ${v.filePath}` };

      const location = await client.getDefinition(pathToUri(v.filePath), {
        line: v.line - 1,
        character: v.character - 1,
      });

      if (!location) return { definition: null };

      return {
        definition: {
          file: uriToPath(location.uri),
          line: location.range.start.line + 1,
          column: location.range.start.character + 1,
        },
      };
    },
  }).toDefinition();
}

export function createLspReferencesTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string; line: number; character: number }, unknown>({
    name: "lsp_references",
    description: "Find all references to a symbol at a specific position in a file.",
    risk: "read",
    input: LspPositionSchema,
    normalize: normalizeInput,
    jsonSchema: POSITION_SCHEMA,
    async execute(v, _ctx: ToolContext) {
      const client = await pool.getOrStart(v.filePath);
      if (!client) return { error: `No LSP server available for ${v.filePath}` };

      const references = await client.getReferences(pathToUri(v.filePath), {
        line: v.line - 1,
        character: v.character - 1,
      });

      return {
        references: references.map((ref) => ({
          file: uriToPath(ref.uri),
          line: ref.range.start.line + 1,
          column: ref.range.start.character + 1,
        })),
      };
    },
  }).toDefinition();
}

export function createLspCompletionTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string; line: number; character: number }, unknown>({
    name: "lsp_completion",
    description: "Get code completion suggestions at a specific position in a file. Returns list of possible completions with labels and details.",
    risk: "read",
    input: LspPositionSchema,
    normalize: normalizeInput,
    jsonSchema: POSITION_SCHEMA,
    async execute(v, _ctx: ToolContext) {
      const client = await pool.getOrStart(v.filePath);
      if (!client) return { error: `No LSP server available for ${v.filePath}` };
      const items = await client.getCompletion(pathToUri(v.filePath), {
        line: v.line - 1, character: v.character - 1,
      });
      return {
        path: v.filePath, line: v.line, column: v.character,
        completions: items.map((i) => ({
          label: i.label, kind: completionKindToString(i.kind), detail: i.detail,
        })),
      };
    },
  }).toDefinition();
}

export function createLspTypeDefinitionTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string; line: number; character: number }, unknown>({
    name: "lsp_type_definition",
    description: "Find the type definition of a symbol at a specific position. Shows where the symbol's type is defined.",
    risk: "read",
    input: LspPositionSchema,
    normalize: normalizeInput,
    jsonSchema: POSITION_SCHEMA,
    async execute(v, _ctx: ToolContext) {
      const client = await pool.getOrStart(v.filePath);
      if (!client) return { error: `No LSP server available for ${v.filePath}` };
      const location = await client.getTypeDefinition(pathToUri(v.filePath), {
        line: v.line - 1, character: v.character - 1,
      });
      if (!location) return { definition: null };
      return { definition: { file: uriToPath(location.uri), line: location.range.start.line + 1, column: location.range.start.character + 1 } };
    },
  }).toDefinition();
}

export function createLspImplementationTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string; line: number; character: number }, unknown>({
    name: "lsp_implementation",
    description: "Find implementations of an interface or abstract method at a specific position.",
    risk: "read",
    input: LspPositionSchema,
    normalize: normalizeInput,
    jsonSchema: POSITION_SCHEMA,
    async execute(v, _ctx: ToolContext) {
      const client = await pool.getOrStart(v.filePath);
      if (!client) return { error: `No LSP server available for ${v.filePath}` };
      const location = await client.getImplementation(pathToUri(v.filePath), {
        line: v.line - 1, character: v.character - 1,
      });
      if (!location) return { implementation: null };
      return { implementation: { file: uriToPath(location.uri), line: location.range.start.line + 1, column: location.range.start.character + 1 } };
    },
  }).toDefinition();
}

export function createLspSignatureHelpTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string; line: number; character: number }, unknown>({
    name: "lsp_signature_help",
    description: "Get signature information (parameter names, types) for a function/method call at a specific position.",
    risk: "read",
    input: LspPositionSchema,
    normalize: normalizeInput,
    jsonSchema: POSITION_SCHEMA,
    async execute(v, _ctx: ToolContext) {
      const client = await pool.getOrStart(v.filePath);
      if (!client) return { error: `No LSP server available for ${v.filePath}` };
      const sig = await client.getSignatureHelp(pathToUri(v.filePath), {
        line: v.line - 1, character: v.character - 1,
      });
      if (!sig || sig.signatures.length === 0) return { signatures: [] };
      return {
        activeSignature: sig.activeSignature ?? 0,
        activeParameter: sig.activeParameter ?? 0,
        signatures: sig.signatures.map((s) => ({
          label: s.label,
          documentation: typeof s.documentation === "string" ? s.documentation : s.documentation?.value,
          parameters: s.parameters?.map((p) => ({ label: p.label, documentation: typeof p.documentation === "string" ? p.documentation : p.documentation?.value })) ?? [],
        })),
      };
    },
  }).toDefinition();
}

export function createLspDocumentSymbolsTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string }, unknown>({
    name: "lsp_document_symbols",
    description: "List all symbols (classes, functions, variables, etc.) defined in a file. Returns hierarchical structure with line numbers.",
    risk: "read",
    input: LspDiagnosticsSchema,
    normalize: normalizeInput,
    jsonSchema: PATH_SCHEMA,
    async execute(v, _ctx: ToolContext) {
      const client = await pool.getOrStart(v.filePath);
      if (!client) return { error: `No LSP server available for ${v.filePath}` };
      const symbols = await client.getDocumentSymbols(pathToUri(v.filePath));
      return { path: v.filePath, symbols: flattenDocumentSymbols(symbols).map((s) => ({ name: s.name, kind: symbolKindToString(s.kind), line: s.range.start.line + 1, detail: s.detail })) };
    },
  }).toDefinition();
}

export function createLspCodeActionTool(pool: LspPool): ToolDefinition {
  return defineTool<{ filePath: string; line: number; character: number }, unknown>({
    name: "lsp_code_action",
    description: "Get available code actions (quick fixes, refactorings) for a specific line in a file. Returns actionable suggestions with descriptions.",
    risk: "read",
    input: LspPositionSchema,
    normalize: normalizeInput,
    jsonSchema: POSITION_SCHEMA,
    async execute(v, _ctx: ToolContext) {
      const client = await pool.getOrStart(v.filePath);
      if (!client) return { error: `No LSP server available for ${v.filePath}` };
      const uri = pathToUri(v.filePath);
      const diagnostics = await pool.getDiagnostics(v.filePath);
      const range = { start: { line: v.line - 1, character: 0 }, end: { line: v.line - 1, character: 65535 } };
      const actions = await client.getCodeActions(uri, range, { diagnostics });
      return {
        path: v.filePath, line: v.line,
        codeActions: actions.map((a) => ({ title: a.title, kind: a.kind, diagnostics: a.diagnostics?.length })),
      };
    },
  }).toDefinition();
}

function completionKindToString(kind: number | undefined): string {
  const names: Record<number, string> = {
    1: "Text", 2: "Method", 3: "Function", 4: "Constructor", 5: "Field",
    6: "Variable", 7: "Class", 8: "Interface", 9: "Module", 10: "Property",
    11: "Unit", 12: "Value", 13: "Enum", 14: "Keyword", 15: "Snippet",
    16: "Color", 17: "File", 18: "Reference", 19: "Folder", 20: "EnumMember",
    21: "Constant", 22: "Struct", 23: "Event", 24: "Operator", 25: "TypeParameter",
  };
  return kind !== undefined ? (names[kind] ?? `Kind(${kind})`) : "Unknown";
}

function symbolKindToString(kind: number): string {
  const names: Record<number, string> = {
    1: "File", 2: "Module", 3: "Namespace", 4: "Package", 5: "Class",
    6: "Method", 7: "Property", 8: "Field", 9: "Constructor", 10: "Enum",
    11: "Interface", 12: "Function", 13: "Variable", 14: "Constant",
    15: "String", 16: "Number", 17: "Boolean", 18: "Array", 19: "Object",
    20: "Key", 21: "Null", 22: "EnumMember", 23: "Struct", 24: "Event",
    25: "Operator", 26: "TypeParameter",
  };
  return names[kind] ?? `Kind(${kind})`;
}

function flattenDocumentSymbols(symbols: LspDocumentSymbol[]): { name: string; kind: number; range: LspRange; detail?: string }[] {
  const result: { name: string; kind: number; range: LspRange; detail?: string }[] = [];
  function walk(syms: LspDocumentSymbol[]) {
    for (const s of syms) {
      result.push({ name: s.name, kind: s.kind, range: s.range, detail: s.detail });
      if (s.children) walk(s.children);
    }
  }
  walk(symbols);
  return result;
}

export function createLspTools(pool: LspPool): ToolDefinition[] {
  return [
    createLspDiagnosticsTool(pool),
    createLspSymbolsTool(pool),
    createLspHoverTool(pool),
    createLspDefinitionTool(pool),
    createLspReferencesTool(pool),
    createLspCompletionTool(pool),
    createLspTypeDefinitionTool(pool),
    createLspImplementationTool(pool),
    createLspSignatureHelpTool(pool),
    createLspDocumentSymbolsTool(pool),
    createLspCodeActionTool(pool),
  ];
}
