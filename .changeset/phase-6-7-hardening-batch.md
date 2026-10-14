---
"@vinhnt-sdk/config": minor
"@vinhnt-sdk/core": minor
"@vinhnt-sdk/event": minor
"@vinhnt-sdk/guard": minor
"@vinhnt-sdk/guardrails": minor
"@vinhnt-sdk/knowledge": minor
"@vinhnt-sdk/llm": minor
"@vinhnt-sdk/lsp": minor
"@vinhnt-sdk/mcp": minor
"@vinhnt-sdk/permission": minor
"@vinhnt-sdk/plugin": minor
"@vinhnt-sdk/provider-openai-compatible": minor
"@vinhnt-sdk/sandbox": minor
"@vinhnt-sdk/schema": minor
"@vinhnt-sdk/security": minor
"@vinhnt-sdk/session": minor
"@vinhnt-sdk/step-executor": minor
"@vinhnt-sdk/test-utils": minor
"@vinhnt-sdk/tools": minor
"@vinhnt-sdk/tools-browser": minor
"@vinhnt-sdk/trace": minor
"@vinhnt-sdk/workflow": minor
---

Hardening batch P5.10/P5.11 + Phase 6/7 (2026-10-11 → 2026-10-13), aligned by
the `fixed: ["@vinhnt-sdk/*"]` changesets group.

- **Features**: prompt-cache request shaping (`cache_control` / `prompt_cache_key`); per-step file snapshot → undo (opt-in `fileSnapshot`); permission modes (`default`/`acceptEdits`/`plan`/`bypass`/`auto`) + risk classifier + `PreCompact`/`SessionEnd` hooks; OTel `gen_ai.*` run tracing (opt-in OTLP); session event replay, `SerializedRunState` resume + session fork; `apply_patch` structured `*** Begin Patch` grammar; container sandbox backend (Docker, `--network none`); auto-memory + `MemoryService` search; MCP server dispatch + stdio server; workflow agent graphs; **new package `@vinhnt-sdk/tools-browser`** (browser/image-gen tools, driver-injected); A2A v1.0 Agent Card discovery (`/.well-known/agent-card.json`, ETag/304).
- **Breaking (barrel/API hygiene, P5.9/P5.11)**: ~78 dead exports removed from package barrels; `@vinhnt-sdk/provider-spec` deleted; `plugin/npm-loader` removed from the SDK (library must not run `npm install`); `define-tool.ts` `any` types replaced with structural interfaces.
- **Infra**: `scripts/check-docs-exports.mjs` + `scripts/check-dead-exports.mjs --gate` wired into `npm run lint`; AGENTS.md accuracy (22 packages).
