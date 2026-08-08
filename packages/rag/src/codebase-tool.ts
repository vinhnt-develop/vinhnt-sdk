import type { ToolDefinition } from "@vinhnt-sdk/core";
import { CodebaseMapper } from "./codebase-mapper.js";

export function createCodebaseSearchTool(getMapper: () => CodebaseMapper | undefined): ToolDefinition {
  return {
    id: "codebase_search",
    description: "Search for symbols (functions, classes, types, interfaces) in the codebase by name. Use this to find relevant source files before reading them.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Symbol name or keyword to search for" },
        maxResults: { type: "number", description: "Maximum results (default 10)", default: 10 },
      },
      required: ["query"],
    },
    risk: "read",
    async execute(input: { query: string; maxResults?: number }) {
      const mapper = getMapper();
      if (!mapper) return { error: "Codebase map not built yet. Run /rag build-map first." };
      const results = mapper.searchSymbol(input.query, input.maxResults ?? 10);
      return results.map((r) => ({
        name: r.name,
        kind: r.kind,
        file: r.file,
        line: r.line,
      }));
    },
  };
}

export function createCodebaseFileTool(getMapper: () => CodebaseMapper | undefined): ToolDefinition {
  return {
    id: "codebase_file_symbols",
    description: "Get all symbols exported or defined in a specific file.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "File path relative to workspace root" },
      },
      required: ["filePath"],
    },
    risk: "read",
    async execute(input: { filePath: string }) {
      const mapper = getMapper();
      if (!mapper) return { error: "Codebase map not built yet." };
      const symbols = mapper.getFileSymbols(input.filePath);
      return symbols.map((s) => ({ name: s.name, kind: s.kind, line: s.line }));
    },
  };
}

export function createCodebaseReferencesTool(getMapper: () => CodebaseMapper | undefined): ToolDefinition {
  return {
    id: "codebase_references",
    description: "Find where a symbol is defined and imported across the codebase.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Symbol name to find references for" },
      },
      required: ["symbol"],
    },
    risk: "read",
    async execute(input: { symbol: string }) {
      const mapper = getMapper();
      if (!mapper) return { error: "Codebase map not built yet." };
      const refs = mapper.findReferences(input.symbol);
      return refs.map((r) => ({ file: r.file, line: r.line }));
    },
  };
}
