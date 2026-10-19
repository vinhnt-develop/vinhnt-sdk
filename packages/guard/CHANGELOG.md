# @vinhnt-sdk/guard

## 0.18.0

### Patch Changes

- Updated dependencies [d9a75b9]
  - @vinhnt-sdk/schema@0.18.0

## 0.17.0

### Patch Changes

- Updated dependencies [ffbffa5]
  - @vinhnt-sdk/schema@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [8401a47]
  - @vinhnt-sdk/schema@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/schema@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [83d6536]
  - @vinhnt-sdk/schema@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [5b3ecb6]
  - @vinhnt-sdk/schema@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/schema@0.12.0

## 0.11.0

### Minor Changes

- a9286a9: Hardening batch P5.10/P5.11 + Phase 6/7 (2026-10-11 → 2026-10-13), aligned by
  the `fixed: ["@vinhnt-sdk/*"]` changesets group.
  
  - **Features**: prompt-cache request shaping (`cache_control` / `prompt_cache_key`); per-step file snapshot → undo (opt-in `fileSnapshot`); permission modes (`default`/`acceptEdits`/`plan`/`bypass`/`auto`) + risk classifier + `PreCompact`/`SessionEnd` hooks; OTel `gen_ai.*` run tracing (opt-in OTLP); session event replay, `SerializedRunState` resume + session fork; `apply_patch` structured `*** Begin Patch` grammar; container sandbox backend (Docker, `--network none`); auto-memory + `MemoryService` search; MCP server dispatch + stdio server; workflow agent graphs; **new package `@vinhnt-sdk/tools-browser`** (browser/image-gen tools, driver-injected); A2A v1.0 Agent Card discovery (`/.well-known/agent-card.json`, ETag/304).
  - **Breaking (barrel/API hygiene, P5.9/P5.11)**: ~78 dead exports removed from package barrels; `@vinhnt-sdk/provider-spec` deleted; `plugin/npm-loader` removed from the SDK (library must not run `npm install`); `define-tool.ts` `any` types replaced with structural interfaces.
  - **Infra**: `scripts/check-docs-exports.mjs` + `scripts/check-dead-exports.mjs --gate` wired into `npm run lint`; AGENTS.md accuracy (22 packages).

### Patch Changes

- Updated dependencies [a9286a9]
  - @vinhnt-sdk/schema@0.11.0
