import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createLspDiagnosticsTool,
  createLspSymbolsTool,
  createLspHoverTool,
  createLspDefinitionTool,
  createLspReferencesTool,
  createLspCompletionTool,
  createLspTypeDefinitionTool,
  createLspImplementationTool,
  createLspSignatureHelpTool,
  createLspDocumentSymbolsTool,
  createLspCodeActionTool,
  createLspTools,
} from "../src/lsp-tools.js";
import type { ToolContext } from "@vinhnt-sdk/core";
import type { LspPool } from "../src/pool.js";

type DiagnosticsResult = {
  path: string;
  errorCount: number;
  diagnostics: Array<{ severity: string; line: number; column: number; message: string; source?: string; code?: string | number }>;
  summary: string;
};

type SymbolsResult = {
  query: string;
  results: Array<{ name: string; kind: string; file: string; line: number }>;
};

type HoverResult = {
  path?: string;
  line?: number;
  column?: number;
  contents: string | null;
  error?: string;
};

type DefinitionResult = {
  definition: { file: string; line: number; column: number };
};

type ReferencesResult = {
  references: Array<{ file: string; line: number; column: number }>;
};

type CompletionResult = {
  path: string;
  line: number;
  column: number;
  completions: Array<{ label: string; kind: string; detail?: string }>;
};

type TypeDefinitionResult = {
  definition: { file: string; line: number; column: number };
};

type ImplementationResult = {
  implementation: { file: string; line: number; column: number };
};

type SignatureHelpResult = {
  activeSignature: number;
  activeParameter: number;
  signatures: Array<{
    label: string;
    documentation?: string;
    parameters: Array<{ label: string; documentation?: string }>;
  }>;
};

type DocumentSymbolsResult = {
  path: string;
  symbols: Array<{ name: string; kind: string; line: number; detail?: string }>;
};

type CodeActionResult = {
  path: string;
  line: number;
  codeActions: Array<{ title: string; kind?: string; diagnostics?: number }>;
};

const mockClient = {
  getDiagnostics: vi.fn().mockResolvedValue([]),
  getSymbols: vi.fn().mockResolvedValue([]),
  getHover: vi.fn().mockResolvedValue(null),
  getDefinition: vi.fn().mockResolvedValue(null),
  getReferences: vi.fn().mockResolvedValue([]),
  getCompletion: vi.fn().mockResolvedValue([]),
  getTypeDefinition: vi.fn().mockResolvedValue(null),
  getImplementation: vi.fn().mockResolvedValue(null),
  getSignatureHelp: vi.fn().mockResolvedValue(null),
  getDocumentSymbols: vi.fn().mockResolvedValue([]),
  getCodeActions: vi.fn().mockResolvedValue([]),
};

const mockPool = {
  getOrStart: vi.fn().mockResolvedValue(mockClient),
  getOrStartForWorkspace: vi.fn().mockResolvedValue(mockClient),
  getDiagnostics: vi.fn().mockResolvedValue([]),
  waitAndGetDiagnostics: vi.fn().mockResolvedValue([]),
  getStatus: vi.fn().mockReturnValue([
    { id: "typescript", root: "/test", languageId: "typescript", connected: true, since: Date.now() },
  ]),
} as unknown as LspPool;

const ctx = { ask: vi.fn() } as unknown as ToolContext;

beforeEach(() => {
  vi.clearAllMocks();
  mockPool.getOrStart = vi.fn().mockResolvedValue(mockClient);
  mockPool.getDiagnostics = vi.fn().mockResolvedValue([]);
  mockPool.waitAndGetDiagnostics = vi.fn().mockResolvedValue([]);
  mockPool.getStatus = vi.fn().mockReturnValue([
    { id: "typescript", root: "/test", languageId: "typescript", connected: true, since: Date.now() },
  ]);
  mockClient.getDiagnostics = vi.fn().mockResolvedValue([]);
  mockClient.getSymbols = vi.fn().mockResolvedValue([]);
  mockClient.getHover = vi.fn().mockResolvedValue(null);
  mockClient.getDefinition = vi.fn().mockResolvedValue(null);
  mockClient.getReferences = vi.fn().mockResolvedValue([]);
  mockClient.getCompletion = vi.fn().mockResolvedValue([]);
  mockClient.getTypeDefinition = vi.fn().mockResolvedValue(null);
  mockClient.getImplementation = vi.fn().mockResolvedValue(null);
  mockClient.getSignatureHelp = vi.fn().mockResolvedValue(null);
  mockClient.getDocumentSymbols = vi.fn().mockResolvedValue([]);
  mockClient.getCodeActions = vi.fn().mockResolvedValue([]);
});

describe("createLspTools", () => {
  it("returns 11 tool definitions", () => {
    const tools = createLspTools(mockPool);
    expect(tools).toHaveLength(11);
  });

  it("all tools have required fields", () => {
    const tools = createLspTools(mockPool);
    for (const tool of tools) {
      expect(tool.id).toMatch(/^lsp_/);
      expect(tool.description).toBeTruthy();
      expect(tool.risk).toBe("read");
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("all tools have unique ids", () => {
    const tools = createLspTools(mockPool);
    const ids = tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("createLspDiagnosticsTool", () => {
  const tool = createLspDiagnosticsTool(mockPool);

  it("returns diagnostic info for a file", async () => {
    mockPool.getDiagnostics = vi.fn().mockResolvedValue([
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, message: "test error", severity: 1, source: "test", code: "E001" },
    ]);
    const result = (await tool.execute({ filePath: "/test/file.ts" }, ctx)) as DiagnosticsResult;
    expect(result).toHaveProperty("path", "/test/file.ts");
    expect(result).toHaveProperty("errorCount", 1);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe("error");
    expect(typeof result.summary).toBe("string");
  });

  it("normalizes path alias", async () => {
    mockPool.getDiagnostics = vi.fn().mockResolvedValue([]);
    const result = (await tool.execute({ path: "/test/file.ts" }, ctx)) as DiagnosticsResult;
    expect(result).toHaveProperty("path", "/test/file.ts");
  });

  it("handles empty diagnostics", async () => {
    mockPool.getDiagnostics = vi.fn().mockResolvedValue([]);
    const result = (await tool.execute({ filePath: "/test/file.ts" }, ctx)) as DiagnosticsResult;
    expect(result.diagnostics).toEqual([]);
    expect(result.errorCount).toBe(0);
  });
});

describe("createLspSymbolsTool", () => {
  const tool = createLspSymbolsTool(mockPool);

  it("returns symbol results", async () => {
    mockClient.getSymbols = vi.fn().mockResolvedValue([
      { name: "myFunc", kind: 12, location: { uri: "file:///test/file.ts", range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } } } },
    ]);
    const result = (await tool.execute({ query: "myFunc", filePath: "myFunc" }, ctx)) as SymbolsResult;
    expect(Array.isArray(result.results)).toBe(true);
  });

  it("returns empty results when no symbols", async () => {
    const result = (await tool.execute({ query: "nonexistent", filePath: "nonexistent" }, ctx)) as SymbolsResult;
    expect(result.results).toEqual([]);
  });

  it("skips disconnected servers", async () => {
    mockPool.getStatus = vi.fn().mockReturnValue([
      { id: "typescript", root: "/test", languageId: "typescript", connected: false, since: Date.now() },
    ]);
    mockPool.getOrStart = vi.fn();
    const result = (await tool.execute({ query: "foo", filePath: "foo" }, ctx)) as SymbolsResult;
    expect(mockPool.getOrStart).not.toHaveBeenCalled();
    expect(result.results).toEqual([]);
  });

  it("skips servers whose language does not match the query extension", async () => {
    mockPool.getStatus = vi.fn().mockReturnValue([
      { id: "python", root: "/test", languageId: "python", connected: true, since: Date.now() },
    ]);
    mockPool.getOrStart = vi.fn();
    const result = (await tool.execute({ query: "foo", filePath: "Foo.ts" }, ctx)) as SymbolsResult;
    expect(mockPool.getOrStart).not.toHaveBeenCalled();
    expect(result.results).toEqual([]);
  });
});

describe("createLspHoverTool", () => {
  const tool = createLspHoverTool(mockPool);

  it("returns hover info", async () => {
    mockClient.getHover = vi.fn().mockResolvedValue({ contents: "hover info" });
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as HoverResult;
    expect(result).toHaveProperty("contents", "hover info");
  });

  it("handles no LSP server available", async () => {
    mockPool.getOrStart = vi.fn().mockResolvedValue(null);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as HoverResult;
    expect(result).toHaveProperty("error");
  });

  it("handles null hover result", async () => {
    mockClient.getHover = vi.fn().mockResolvedValue(null);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as HoverResult;
    expect(result).toEqual({ contents: null });
  });

  it("handles markup content hover", async () => {
    mockClient.getHover = vi.fn().mockResolvedValue({ contents: { language: "typescript", value: "const x = 1" } });
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as HoverResult;
    expect(result.contents).toContain("```typescript");
  });

  it("handles MarkupContent hover", async () => {
    mockClient.getHover = vi.fn().mockResolvedValue({ contents: { kind: "markdown", value: "# doc" } });
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as HoverResult;
    expect(result.contents).toBe("# doc");
  });
});

describe("createLspDefinitionTool", () => {
  const tool = createLspDefinitionTool(mockPool);

  it("returns definition location", async () => {
    mockClient.getDefinition = vi.fn().mockResolvedValue({ uri: "file:///test/def.ts", range: { start: { line: 5, character: 2 }, end: { line: 5, character: 10 } } });
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as DefinitionResult;
    expect(result.definition).toHaveProperty("file");
    expect(result.definition.line).toBe(6);
    expect(result.definition.column).toBe(3);
  });

  it("handles null definition", async () => {
    mockClient.getDefinition = vi.fn().mockResolvedValue(null);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as DefinitionResult;
    expect(result).toEqual({ definition: null });
  });

  it("handles array definition response (client normalizes to single)", async () => {
    mockClient.getDefinition = vi.fn().mockResolvedValue(
      { uri: "file:///test/first.ts", range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } },
    );
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as DefinitionResult;
    expect(result.definition.file).toContain("first.ts");
  });
});

describe("createLspReferencesTool", () => {
  const tool = createLspReferencesTool(mockPool);

  it("returns reference locations", async () => {
    mockClient.getReferences = vi.fn().mockResolvedValue([
      { uri: "file:///test/ref.ts", range: { start: { line: 3, character: 0 }, end: { line: 3, character: 5 } } },
    ]);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as ReferencesResult;
    expect(result.references).toHaveLength(1);
    expect(result.references[0]!.line).toBe(4);
  });

  it("handles no references", async () => {
    mockClient.getReferences = vi.fn().mockResolvedValue([]);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as ReferencesResult;
    expect(result.references).toEqual([]);
  });
});

describe("createLspCompletionTool", () => {
  const tool = createLspCompletionTool(mockPool);

  it("returns completion items", async () => {
    mockClient.getCompletion = vi.fn().mockResolvedValue([
      { label: "myFunc", kind: 2, detail: "function" },
    ]);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as CompletionResult;
    expect(result.completions).toHaveLength(1);
    expect(result.completions[0]!.label).toBe("myFunc");
    expect(result.completions[0]!.kind).toBe("Method");
  });

  it("handles completion list format (client normalizes to array)", async () => {
    mockClient.getCompletion = vi.fn().mockResolvedValue([{ label: "item1", kind: 1 }]);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as CompletionResult;
    expect(result.completions).toHaveLength(1);
    expect(result.completions[0]!.kind).toBe("Text");
  });
});

describe("createLspTypeDefinitionTool", () => {
  const tool = createLspTypeDefinitionTool(mockPool);

  it("returns type definition", async () => {
    mockClient.getTypeDefinition = vi.fn().mockResolvedValue({ uri: "file:///test/types.ts", range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } });
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as TypeDefinitionResult;
    expect(result.definition).toBeDefined();
  });

  it("handles null type definition", async () => {
    mockClient.getTypeDefinition = vi.fn().mockResolvedValue(null);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as TypeDefinitionResult;
    expect(result).toEqual({ definition: null });
  });
});

describe("createLspImplementationTool", () => {
  const tool = createLspImplementationTool(mockPool);

  it("returns implementation location", async () => {
    mockClient.getImplementation = vi.fn().mockResolvedValue({ uri: "file:///test/impl.ts", range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } });
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as ImplementationResult;
    expect(result.implementation).toBeDefined();
  });

  it("handles null implementation", async () => {
    mockClient.getImplementation = vi.fn().mockResolvedValue(null);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as ImplementationResult;
    expect(result).toEqual({ implementation: null });
  });
});

describe("createLspSignatureHelpTool", () => {
  const tool = createLspSignatureHelpTool(mockPool);

  it("returns signature info", async () => {
    mockClient.getSignatureHelp = vi.fn().mockResolvedValue({
      signatures: [{ label: "foo(x: number)", documentation: "Does foo", parameters: [{ label: "x: number", documentation: "the x param" }] }],
      activeSignature: 0, activeParameter: 0,
    });
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as SignatureHelpResult;
    expect(result.signatures).toHaveLength(1);
    expect(result.signatures[0]!.label).toBe("foo(x: number)");
    expect(result.signatures[0]!.parameters).toHaveLength(1);
  });

  it("handles no signatures", async () => {
    mockClient.getSignatureHelp = vi.fn().mockResolvedValue(null);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as SignatureHelpResult;
    expect(result.signatures).toEqual([]);
  });
});

describe("createLspDocumentSymbolsTool", () => {
  const tool = createLspDocumentSymbolsTool(mockPool);

  it("returns flattened symbols", async () => {
    mockClient.getDocumentSymbols = vi.fn().mockResolvedValue([
      { name: "MyClass", kind: 5, range: { start: { line: 0, character: 0 }, end: { line: 5, character: 0 } }, selectionRange: { start: { line: 0, character: 0 }, end: { line: 5, character: 0 } }, children: [] },
    ]);
    const result = (await tool.execute({ filePath: "/test/file.ts" }, ctx)) as DocumentSymbolsResult;
    expect(result.symbols).toHaveLength(1);
    expect(result.symbols[0]!.kind).toBe("Class");
  });

  it("flattens nested children", async () => {
    mockClient.getDocumentSymbols = vi.fn().mockResolvedValue([
      { name: "Outer", kind: 5, range: { start: { line: 0, character: 0 }, end: { line: 5, character: 0 } }, selectionRange: { start: { line: 0, character: 0 }, end: { line: 5, character: 0 } }, children: [{ name: "Inner", kind: 6, range: { start: { line: 1, character: 0 }, end: { line: 3, character: 0 } }, selectionRange: { start: { line: 1, character: 0 }, end: { line: 3, character: 0 } } }] },
    ]);
    const result = (await tool.execute({ filePath: "/test/file.ts" }, ctx)) as DocumentSymbolsResult;
    expect(result.symbols).toHaveLength(2);
  });
});

describe("createLspCodeActionTool", () => {
  const tool = createLspCodeActionTool(mockPool);

  it("returns code actions", async () => {
    mockClient.getCodeActions = vi.fn().mockResolvedValue([
      { title: "Fix issue", kind: "quickfix", diagnostics: [] },
    ]);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as CodeActionResult;
    expect(result.codeActions).toHaveLength(1);
    expect(result.codeActions[0]!.title).toBe("Fix issue");
  });

  it("handles no code actions", async () => {
    mockClient.getCodeActions = vi.fn().mockResolvedValue([]);
    const result = (await tool.execute({ path: "/test/file.ts", line: 1, column: 1 }, ctx)) as CodeActionResult;
    expect(result.codeActions).toEqual([]);
  });
});
