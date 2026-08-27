---
title: "Changelog"
description: "Version history and breaking changes"
lang: "en"
type: "reference"
category: "More"
sidebarPosition: 1
---

# Changelog

## v0.1.3 (Current)

### Added
- `CircuitBreakerOpenError` — extends `VntError` with `code: "CIRCUIT_BREAKER_OPEN"`, retryable
- `ToolTimeoutError` — extends `VntError` with `code: "TOOL_TIMEOUT"`, non-retryable
- `CostMeter` — renamed from `TokenMeter` in trace package (tracks actual usage + cost)
- `StreamChunkEvent` — named interface for `fromOpenAIStreamChunk` return type
- `SecretPattern` — now exported from `@vinhnt-sdk/security`
- `streamWithReplayMixin` — shared mixin for event bus replay
- `approximateTokens` — shared utility in `@vinhnt-sdk/knowledge/token-utils`
- Config tests: `parseEnvFile`, `resolveCredentialMultiLayer`, `mergeLayers`
- LLM tests: `LlmRegistry`, `TokenMeter`, `shouldRetry`, `calculateDelay`
- Event tests: `EventBus`, `EventMigration`, `GlobalEventBus`

### Changed
- `SessionRuntimeSnapshot` — all fields now `readonly`
- `LazyToolRegistry.list()` — returns `readonly ToolDefinition[]`
- `OpenAICompatibleRequestBody` — `model`/`messages` fields `readonly`
- `PermissionEffect` — open union: `"allow" | "deny" | "ask" | (string & {})`
- `CredentialSource` — open union for plugin extensions
- Deprecated functions in `LspServerRegistry` — now use cached singleton

### Fixed
- `readFileSync` in async context → `await readFile()` (history-hook)
- `dirsToExlude` typo → `dirsToExclude` (file-tools)
- Vietnamese comments → English (plugin, knowledge, security, lsp)
- `pathFromUri` duplication → shared import from `file-sync.ts`
- `streamWithReplay` duplication → shared mixin
- `approximateTokens` duplication → shared utility
- JSON-RPC types → shared in `@vinhnt-sdk/schema/contracts/json-rpc`

### Removed
- Phantom `rag` package references
- Duplicate `readImageFromImageTools` alias

## v0.1.2-beta.0

- Initial beta release
- 18-package architecture
- Core layer: schema, config, llm, tools, sandbox, guard, session, permission, step-executor, core, provider-openai-compatible
- Extension layer: plugin, knowledge, event, mcp, trace, security, lsp

## v0.1.1

- Pre-release version

## v0.1.0

- Initial project structure
