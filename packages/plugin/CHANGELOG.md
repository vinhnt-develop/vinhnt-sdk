# @vinhnt-sdk/plugin

## 0.21.0

### Patch Changes

- Updated dependencies [add6cda]
  - @vinhnt-sdk/core@0.21.0

## 0.20.0

### Patch Changes

- @vinhnt-sdk/core@0.20.0

## 0.19.0

### Patch Changes

- Updated dependencies [b476bec]
  - @vinhnt-sdk/core@0.19.0

## 0.18.0

### Patch Changes

- @vinhnt-sdk/core@0.18.0

## 0.17.0

### Patch Changes

- Updated dependencies [ffbffa5]
  - @vinhnt-sdk/core@0.17.0

## 0.16.0

### Patch Changes

- @vinhnt-sdk/core@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/core@0.15.0

## 0.14.0

### Patch Changes

- @vinhnt-sdk/core@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [5b3ecb6]
  - @vinhnt-sdk/core@0.13.0

## 0.12.0

### Patch Changes

- @vinhnt-sdk/core@0.12.0

## 0.11.0

### Minor Changes

- a9286a9: Hardening batch P5.10/P5.11 + Phase 6/7 (2026-10-11 → 2026-10-13), aligned by
  the `fixed: ["@vinhnt-sdk/*"]` changesets group.
  
  - **Features**: prompt-cache request shaping (`cache_control` / `prompt_cache_key`); per-step file snapshot → undo (opt-in `fileSnapshot`); permission modes (`default`/`acceptEdits`/`plan`/`bypass`/`auto`) + risk classifier + `PreCompact`/`SessionEnd` hooks; OTel `gen_ai.*` run tracing (opt-in OTLP); session event replay, `SerializedRunState` resume + session fork; `apply_patch` structured `*** Begin Patch` grammar; container sandbox backend (Docker, `--network none`); auto-memory + `MemoryService` search; MCP server dispatch + stdio server; workflow agent graphs; **new package `@vinhnt-sdk/tools-browser`** (browser/image-gen tools, driver-injected); A2A v1.0 Agent Card discovery (`/.well-known/agent-card.json`, ETag/304).
  - **Breaking (barrel/API hygiene, P5.9/P5.11)**: ~78 dead exports removed from package barrels; `@vinhnt-sdk/provider-spec` deleted; `plugin/npm-loader` removed from the SDK (library must not run `npm install`); `define-tool.ts` `any` types replaced with structural interfaces.
  - **Infra**: `scripts/check-docs-exports.mjs` + `scripts/check-dead-exports.mjs --gate` wired into `npm run lint`; AGENTS.md accuracy (22 packages).

### Patch Changes

- Updated dependencies [a9286a9]
  - @vinhnt-sdk/core@0.11.0

## 0.1.1-beta.0

### Patch Changes

- Refactor to minimal library architecture (9 packages)

  - Extracted `@vinhnt-sdk/security` from core (prompt injection protection, secret redaction)
  - Extracted `@vinhnt-sdk/knowledge` from core (memory, context compression, learning engine)
  - Extracted `@vinhnt-sdk/tools` from core (file, shell, git, web, search tools)
  - Moved model types (`ChatMessage`, `ModelProvider`, `ModelRequest`, etc.) to `@vinhnt-sdk/schema`
  - Added `ToolDefinitionLike` interface to schema for cross-package typing
  - Added `ConversationCompactor`, `SessionStore`, `RunEventStore` interfaces to schema
  - Updated `ModelProvider` interface: added `provider` (required), `capabilities`, required `stream()`
  - Added `ModelCapabilities` interface for feature flags
  - Added `temperature`, `topP`, `stopSequences`, `providerOptions` to `ModelRequest`
  - Fixed LSP Windows-only `where` command (now cross-platform)
  - Fixed RAG Voyage hardcoded URL (added `baseUrl` config option)
  - Core re-exports all extracted packages for backward compatibility

- Major refactor: split core into tools/knowledge/security packages, remove non-library packages, fix all hardcoded data violations.
- Updated dependencies
  - @vinhnt-sdk/core@0.1.1-beta.0

## 0.1.2 (Deprecated)

### Patch Changes

- Published by mistake. Use 0.1.1-beta.0 instead.

## 0.1.1 (Deprecated)

### Patch Changes

- Published by mistake. Use 0.1.1-beta.0 instead.

## 0.1.0 (Deprecated)

### Patch Changes

- Initial release (deprecated).
