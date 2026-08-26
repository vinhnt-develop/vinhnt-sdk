// @vinhnt-sdk/lsp
// Language Server Protocol integration for AI coding agents
//
// PUBLIC API - Only essential exports for users

// === LSP Client ===
export { LspClient } from "./client.js";
export { LspPool } from "./pool.js";
export { BUILTIN_SERVERS, LspServerRegistry } from "./server-registry.js";

// === Diagnostics ===
export { DiagnosticStore, formatDiagnostics } from "./diagnostics.js";

// === Tools ===
export { createLspTools } from "./lsp-tools.js";
export { LspToolProvider } from "./lsp-tool-provider.js";

// === Types ===
export type { LspServerDefinition, LspDiagnostic, LspPosition, LspRange } from "./types.js";
