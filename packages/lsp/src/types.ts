import type { ToolDefinition } from "@vinhnt-sdk/tools";
import type { JsonRpcMessage, JsonRpcRequest, JsonRpcResponse, JsonRpcError, JsonRpcNotification } from "@vinhnt-sdk/schema";

/* ── Re-export JSON-RPC types for backward compatibility ── */
export type { JsonRpcMessage, JsonRpcRequest, JsonRpcResponse, JsonRpcError, JsonRpcNotification } from "@vinhnt-sdk/schema";

/* ── LSP types ── */

export interface LspPosition {
  line: number;
  character: number;
}

export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

export interface LspDiagnostic {
  range: LspRange;
  severity?: LspDiagnosticSeverity;
  code?: string | number;
  source?: string;
  message: string;
}

export enum LspDiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface LspDiagnosticParams {
  uri: string;
  diagnostics: LspDiagnostic[];
}

export interface LspTextDocumentItem {
  uri: string;
  languageId: string;
  version: number;
  text: string;
}

export interface LspTextDocumentChange {
  textDocument: { uri: string; version: number };
  contentChanges: { text: string }[];
}

export interface LspInitializeResult {
  capabilities: Record<string, unknown>;
  serverInfo?: { name: string; version?: string };
}

export interface LspSymbol {
  name: string;
  kind: LspSymbolKind;
  location: { uri: string; range: LspRange };
  containerName?: string;
}

export enum LspSymbolKind {
  File = 1, Module = 2, Namespace = 3, Package = 4, Class = 5,
  Method = 6, Property = 7, Field = 8, Constructor = 9, Enum = 10,
  Interface = 11, Function = 12, Variable = 13, Constant = 14,
  String = 15, Number = 16, Boolean = 17, Array = 18, Object = 19,
  Key = 20, Null = 21, EnumMember = 22, Struct = 23, Event = 24,
  Operator = 25, TypeParameter = 26,
}

export interface LspHoverResult {
  contents: LspMarkupContent | string | { language: string; value: string };
  range?: LspRange;
}

export interface LspMarkupContent {
  kind: "plaintext" | "markdown";
  value: string;
}

export interface LspLocation {
  uri: string;
  range: LspRange;
}

export interface LspCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  insertText?: string;
}

export interface LspCompletionList {
  isIncomplete: boolean;
  items: LspCompletionItem[];
}

export interface LspDocumentSymbol {
  name: string;
  detail?: string;
  kind: LspSymbolKind;
  range: LspRange;
  selectionRange: LspRange;
  children?: LspDocumentSymbol[];
}

export interface LspSignatureHelp {
  signatures: LspSignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface LspSignatureInformation {
  label: string;
  documentation?: string | LspMarkupContent;
  parameters?: LspParameterInformation[];
}

export interface LspParameterInformation {
  label: string;
  documentation?: string | LspMarkupContent;
}

export interface LspCodeAction {
  title: string;
  kind?: string;
  diagnostics?: LspDiagnostic[];
  edit?: LspWorkspaceEdit;
  command?: LspCommand;
}

export interface LspWorkspaceEdit {
  changes?: Record<string, LspTextEdit[]>;
}

export interface LspTextEdit {
  range: LspRange;
  newText: string;
}

export interface LspCommand {
  title: string;
  command: string;
  arguments?: unknown[];
}

export interface LspFormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
}

export interface LspDocumentUri {
  uri: string;
}

export interface LspLocationLink {
  originSelectionRange?: LspRange;
  targetUri: string;
  targetRange: LspRange;
  targetSelectionRange: LspRange;
}

export type LspDefinitionResponse = LspLocation | LspLocation[] | LspLocationLink[] | null;

/* ── Server definitions ── */

export interface LspServerDefinition {
  id: string;
  name: string;
  languageId: string;
  extensions: string[];
  command: string;
  args: string[];
  rootFiles: string[];
  autoInstall?: string;
  env?: Record<string, string>;
  initializationOptions?: Record<string, unknown>;
  isExperimental?: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface LspServerStatus {
  id: string;
  root: string;
  languageId: string;
  connected: boolean;
  since: number;
}

export interface LspPoolConfig {
  idleTimeoutMs: number;
  maxRetries: number;
  initTimeoutMs: number;
  waitDiagnosticsMs: number;
}

export const DEFAULT_LSP_POOL_CONFIG: LspPoolConfig = {
  idleTimeoutMs: 300_000,
  maxRetries: 3,
  initTimeoutMs: 45_000,
  waitDiagnosticsMs: 5_000,
};

export type LspToolDefinition = ToolDefinition & { category: "lsp" };
