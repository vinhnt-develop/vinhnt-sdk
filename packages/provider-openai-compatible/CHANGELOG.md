# @vinhnt-sdk/provider-openai-compatible

## 0.25.1

### Patch Changes

- Fix Google provider authentication and parameter stripping
  
  - Use `?key=<API_KEY>` query parameter instead of `Authorization: Bearer <key>` header for Google's Generative Language API (fixes 401 OAuth error)
  - Add `stripParameters` option to drop OpenAI-specific fields Google doesn't recognise (fixes 400 Bad Request: `parallel_tool_calls`, `stream_options`, `presence_penalty`, etc.)
  - Add `nativeChatUrl` override for providers with non-standard chat endpoints
  - Add `authStyle` support (bearer | query | header-x-goog | header-x-api-key)
- @vinhnt-sdk/config@0.25.1
  - @vinhnt-sdk/guard@0.25.1
  - @vinhnt-sdk/schema@0.25.1

## 0.25.0

### Minor Changes

- feat: add flexible auth and custom chat URL per provider
  
  Add `authStyle` ('bearer' | 'query' | 'header-x-goog' | 'header-x-api-key') and `nativeChatUrl` options to `OpenAICompatibleProviderOptions` so consumers can configure non-OpenAI-compatible providers (e.g. Google native `x-goog-api-key`, Anthropic `x-api-key`) without forking the SDK.
- Add `authStyle` and `nativeChatUrl` options to `OpenAICompatibleProvider` and `ProviderPreset` so consumers can configure non-OpenAI providers (e.g. Google native `x-goog-api-key`, Anthropic `x-api-key`, query-param API keys) without forking the SDK. `authStyle` defaults to `'bearer'`; `nativeChatUrl` defaults to `${baseUrl}/chat/completions`.

### Patch Changes

- @vinhnt-sdk/config@0.25.0
  - @vinhnt-sdk/guard@0.25.0
  - @vinhnt-sdk/schema@0.25.0

## 0.24.0

### Minor Changes

- refactor: remove provider-specific presets from provider-openai-compatible
  
  Remove DeepSeek, Anthropic, and Ollama presets from `@vinhnt-sdk/provider-openai-compatible`. The package now exports only the generic `createProviderFromPreset` factory and `OpenAICompatibleProvider`. Provider-specific presets belong in the application layer so consumers can extend without forking. Use `createProviderFromPreset` to configure Google (or any OpenAI-compatible) provider directly.

### Patch Changes

- @vinhnt-sdk/config@0.24.0
  - @vinhnt-sdk/guard@0.24.0
  - @vinhnt-sdk/schema@0.24.0

## 0.23.1

### Patch Changes

- @vinhnt-sdk/config@0.23.1
  - @vinhnt-sdk/guard@0.23.1
  - @vinhnt-sdk/schema@0.23.1

## 0.23.0

### Patch Changes

- @vinhnt-sdk/config@0.23.0
  - @vinhnt-sdk/guard@0.23.0
  - @vinhnt-sdk/schema@0.23.0

## 0.22.0

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/schema@0.22.0
  - @vinhnt-sdk/config@0.22.0
  - @vinhnt-sdk/guard@0.22.0

## 0.21.0

### Patch Changes

- @vinhnt-sdk/config@0.21.0
  - @vinhnt-sdk/guard@0.21.0
  - @vinhnt-sdk/schema@0.21.0

## 0.20.0

### Patch Changes

- Updated dependencies [0ca6a58]
  - @vinhnt-sdk/schema@0.20.0
  - @vinhnt-sdk/config@0.20.0
  - @vinhnt-sdk/guard@0.20.0

## 0.19.0

### Patch Changes

- Updated dependencies [b476bec]
  - @vinhnt-sdk/schema@0.19.0
  - @vinhnt-sdk/config@0.19.0
  - @vinhnt-sdk/guard@0.19.0

## 0.18.0

### Patch Changes

- Updated dependencies [d9a75b9]
  - @vinhnt-sdk/schema@0.18.0
  - @vinhnt-sdk/config@0.18.0
  - @vinhnt-sdk/guard@0.18.0

## 0.17.0

### Patch Changes

- Updated dependencies [ffbffa5]
  - @vinhnt-sdk/schema@0.17.0
  - @vinhnt-sdk/config@0.17.0
  - @vinhnt-sdk/guard@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [8401a47]
  - @vinhnt-sdk/schema@0.16.0
  - @vinhnt-sdk/config@0.16.0
  - @vinhnt-sdk/guard@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/schema@0.15.0
  - @vinhnt-sdk/config@0.15.0
  - @vinhnt-sdk/guard@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [83d6536]
  - @vinhnt-sdk/schema@0.14.0
  - @vinhnt-sdk/config@0.14.0
  - @vinhnt-sdk/guard@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [5b3ecb6]
  - @vinhnt-sdk/schema@0.13.0
  - @vinhnt-sdk/config@0.13.0
  - @vinhnt-sdk/guard@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/schema@0.12.0
  - @vinhnt-sdk/config@0.12.0
  - @vinhnt-sdk/guard@0.12.0

## 0.11.0

### Minor Changes

- a9286a9: Hardening batch P5.10/P5.11 + Phase 6/7 (2026-10-11 → 2026-10-13), aligned by
  the `fixed: ["@vinhnt-sdk/*"]` changesets group.
  
  - **Features**: prompt-cache request shaping (`cache_control` / `prompt_cache_key`); per-step file snapshot → undo (opt-in `fileSnapshot`); permission modes (`default`/`acceptEdits`/`plan`/`bypass`/`auto`) + risk classifier + `PreCompact`/`SessionEnd` hooks; OTel `gen_ai.*` run tracing (opt-in OTLP); session event replay, `SerializedRunState` resume + session fork; `apply_patch` structured `*** Begin Patch` grammar; container sandbox backend (Docker, `--network none`); auto-memory + `MemoryService` search; MCP server dispatch + stdio server; workflow agent graphs; **new package `@vinhnt-sdk/tools-browser`** (browser/image-gen tools, driver-injected); A2A v1.0 Agent Card discovery (`/.well-known/agent-card.json`, ETag/304).
  - **Breaking (barrel/API hygiene, P5.9/P5.11)**: ~78 dead exports removed from package barrels; `@vinhnt-sdk/provider-spec` deleted; `plugin/npm-loader` removed from the SDK (library must not run `npm install`); `define-tool.ts` `any` types replaced with structural interfaces.
  - **Infra**: `scripts/check-docs-exports.mjs` + `scripts/check-dead-exports.mjs --gate` wired into `npm run lint`; AGENTS.md accuracy (22 packages).

### Patch Changes

- Updated dependencies [a9286a9]
  - @vinhnt-sdk/config@0.11.0
  - @vinhnt-sdk/guard@0.11.0
  - @vinhnt-sdk/schema@0.11.0
