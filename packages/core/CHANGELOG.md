# @vinhnt-sdk/core

## 0.17.0

### Minor Changes

- ffbffa5: Add the `ui.surface` generative-UI vertical: a durable, approved-catalog surface
  contract (`UiSurface` + `UiSurfaceComponent` schemas/types), the `ui.surface`
  event, `ToolContext.presentSurface`, and the built-in `render_ui` tool. The SDK
  only defines the contract + tool — consumers render against their own catalog
  (no code is ever evaluated).

### Patch Changes

- Updated dependencies [ffbffa5]
  - @vinhnt-sdk/schema@0.17.0
  - @vinhnt-sdk/event@0.17.0
  - @vinhnt-sdk/tools@0.17.0
  - @vinhnt-sdk/step-executor@0.17.0
  - @vinhnt-sdk/guard@0.17.0
  - @vinhnt-sdk/guardrails@0.17.0
  - @vinhnt-sdk/knowledge@0.17.0
  - @vinhnt-sdk/llm@0.17.0
  - @vinhnt-sdk/permission@0.17.0
  - @vinhnt-sdk/sandbox@0.17.0
  - @vinhnt-sdk/session@0.17.0
  - @vinhnt-sdk/trace@0.17.0
  - @vinhnt-sdk/workflow@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [8401a47]
  - @vinhnt-sdk/schema@0.16.0
  - @vinhnt-sdk/step-executor@0.16.0
  - @vinhnt-sdk/event@0.16.0
  - @vinhnt-sdk/guard@0.16.0
  - @vinhnt-sdk/guardrails@0.16.0
  - @vinhnt-sdk/knowledge@0.16.0
  - @vinhnt-sdk/llm@0.16.0
  - @vinhnt-sdk/permission@0.16.0
  - @vinhnt-sdk/sandbox@0.16.0
  - @vinhnt-sdk/session@0.16.0
  - @vinhnt-sdk/tools@0.16.0
  - @vinhnt-sdk/trace@0.16.0
  - @vinhnt-sdk/workflow@0.16.0

## 0.15.0

### Minor Changes

- Add a durable plan-approval (HITL) vertical: `plan.requested` / `plan.replied` events, the `submit_plan` tool + `PlanApprovalStore` in `@vinhnt-sdk/tools`, `ctx.askPlan` in `@vinhnt-sdk/step-executor`, and `AgentKernelConfig.plans` wiring in `@vinhnt-sdk/core`. The agent can present a plan and block until the user approves, requests changes, or cancels.

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/schema@0.15.0
  - @vinhnt-sdk/event@0.15.0
  - @vinhnt-sdk/tools@0.15.0
  - @vinhnt-sdk/step-executor@0.15.0
  - @vinhnt-sdk/trace@0.15.0
  - @vinhnt-sdk/guard@0.15.0
  - @vinhnt-sdk/guardrails@0.15.0
  - @vinhnt-sdk/knowledge@0.15.0
  - @vinhnt-sdk/llm@0.15.0
  - @vinhnt-sdk/permission@0.15.0
  - @vinhnt-sdk/sandbox@0.15.0
  - @vinhnt-sdk/session@0.15.0
  - @vinhnt-sdk/workflow@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [83d6536]
  - @vinhnt-sdk/schema@0.14.0
  - @vinhnt-sdk/permission@0.14.0
  - @vinhnt-sdk/step-executor@0.14.0
  - @vinhnt-sdk/tools@0.14.0
  - @vinhnt-sdk/event@0.14.0
  - @vinhnt-sdk/guard@0.14.0
  - @vinhnt-sdk/guardrails@0.14.0
  - @vinhnt-sdk/knowledge@0.14.0
  - @vinhnt-sdk/llm@0.14.0
  - @vinhnt-sdk/sandbox@0.14.0
  - @vinhnt-sdk/session@0.14.0
  - @vinhnt-sdk/trace@0.14.0
  - @vinhnt-sdk/workflow@0.14.0

## 0.13.0

### Minor Changes

- 5b3ecb6: feat(tools): human-in-the-loop `question` tool — durable `question.requested` / `question.replied` events, injectable `QuestionStore` (+ `InMemoryQuestionStore`), and `ToolContext.askQuestion` for block-await-resume. The `question` tool now supports a 1–4 item batch form and resumes the run with the store reply; wire it via `AgentKernel` config `questions.questionStore`.

### Patch Changes

- Updated dependencies [5b3ecb6]
  - @vinhnt-sdk/tools@0.13.0
  - @vinhnt-sdk/schema@0.13.0
  - @vinhnt-sdk/event@0.13.0
  - @vinhnt-sdk/step-executor@0.13.0
  - @vinhnt-sdk/llm@0.13.0
  - @vinhnt-sdk/guard@0.13.0
  - @vinhnt-sdk/guardrails@0.13.0
  - @vinhnt-sdk/knowledge@0.13.0
  - @vinhnt-sdk/permission@0.13.0
  - @vinhnt-sdk/sandbox@0.13.0
  - @vinhnt-sdk/session@0.13.0
  - @vinhnt-sdk/trace@0.13.0
  - @vinhnt-sdk/workflow@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/schema@0.12.0
  - @vinhnt-sdk/event@0.12.0
  - @vinhnt-sdk/tools@0.12.0
  - @vinhnt-sdk/guard@0.12.0
  - @vinhnt-sdk/guardrails@0.12.0
  - @vinhnt-sdk/knowledge@0.12.0
  - @vinhnt-sdk/llm@0.12.0
  - @vinhnt-sdk/permission@0.12.0
  - @vinhnt-sdk/sandbox@0.12.0
  - @vinhnt-sdk/session@0.12.0
  - @vinhnt-sdk/step-executor@0.12.0
  - @vinhnt-sdk/trace@0.12.0
  - @vinhnt-sdk/workflow@0.12.0

## 0.11.0

### Minor Changes

- a9286a9: Hardening batch P5.10/P5.11 + Phase 6/7 (2026-10-11 → 2026-10-13), aligned by
  the `fixed: ["@vinhnt-sdk/*"]` changesets group.
  
  - **Features**: prompt-cache request shaping (`cache_control` / `prompt_cache_key`); per-step file snapshot → undo (opt-in `fileSnapshot`); permission modes (`default`/`acceptEdits`/`plan`/`bypass`/`auto`) + risk classifier + `PreCompact`/`SessionEnd` hooks; OTel `gen_ai.*` run tracing (opt-in OTLP); session event replay, `SerializedRunState` resume + session fork; `apply_patch` structured `*** Begin Patch` grammar; container sandbox backend (Docker, `--network none`); auto-memory + `MemoryService` search; MCP server dispatch + stdio server; workflow agent graphs; **new package `@vinhnt-sdk/tools-browser`** (browser/image-gen tools, driver-injected); A2A v1.0 Agent Card discovery (`/.well-known/agent-card.json`, ETag/304).
  - **Breaking (barrel/API hygiene, P5.9/P5.11)**: ~78 dead exports removed from package barrels; `@vinhnt-sdk/provider-spec` deleted; `plugin/npm-loader` removed from the SDK (library must not run `npm install`); `define-tool.ts` `any` types replaced with structural interfaces.
  - **Infra**: `scripts/check-docs-exports.mjs` + `scripts/check-dead-exports.mjs --gate` wired into `npm run lint`; AGENTS.md accuracy (22 packages).

### Patch Changes

- Updated dependencies [a9286a9]
  - @vinhnt-sdk/event@0.11.0
  - @vinhnt-sdk/guard@0.11.0
  - @vinhnt-sdk/guardrails@0.11.0
  - @vinhnt-sdk/knowledge@0.11.0
  - @vinhnt-sdk/llm@0.11.0
  - @vinhnt-sdk/permission@0.11.0
  - @vinhnt-sdk/sandbox@0.11.0
  - @vinhnt-sdk/schema@0.11.0
  - @vinhnt-sdk/session@0.11.0
  - @vinhnt-sdk/step-executor@0.11.0
  - @vinhnt-sdk/tools@0.11.0
  - @vinhnt-sdk/trace@0.11.0
  - @vinhnt-sdk/workflow@0.11.0

## 0.1.1-beta.0

### Major Changes

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

### Patch Changes

- Major refactor: split core into tools/knowledge/security packages, remove non-library packages, fix all hardcoded data violations.
- Updated dependencies
  - @vinhnt-sdk/schema@0.1.1-beta.0
  - @vinhnt-sdk/security@0.1.1-beta.0
  - @vinhnt-sdk/knowledge@0.1.1-beta.0
  - @vinhnt-sdk/tools@0.1.1-beta.0
