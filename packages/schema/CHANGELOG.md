# @vinhnt-sdk/schema

## 0.15.0

### Minor Changes

- Add a durable plan-approval (HITL) vertical: `plan.requested` / `plan.replied` events, the `submit_plan` tool + `PlanApprovalStore` in `@vinhnt-sdk/tools`, `ctx.askPlan` in `@vinhnt-sdk/step-executor`, and `AgentKernelConfig.plans` wiring in `@vinhnt-sdk/core`. The agent can present a plan and block until the user approves, requests changes, or cancels.

## 0.14.0

### Minor Changes

- 83d6536: Permission replies can carry a user-supplied reason (additive, non-breaking).
  
  - `schema`: new `ApprovalReply { reply, reason? }` type; `permission.replied` event data gains an optional `reason`.
  - `permission`: `ApprovalStore.awaitReplyWithReason?()` (optional) and `resolveRequest(id, reply, reason?)`; `InMemoryApprovalStore` records and returns the reason. `awaitReply` keeps returning the decision only.
  - `tools`: `ToolContext.ask` input gains an optional `onReply(reply, reason?)` observer so hosts can read feedback without changing the return type.
  - `step-executor`: `PermissionGate.askForTool` accepts `onReply`; the reject reason is emitted on `permission.replied` and fed back to the model in the rejection tool result.

## 0.13.0

### Minor Changes

- 5b3ecb6: feat(tools): human-in-the-loop `question` tool — durable `question.requested` / `question.replied` events, injectable `QuestionStore` (+ `InMemoryQuestionStore`), and `ToolContext.askQuestion` for block-await-resume. The `question` tool now supports a 1–4 item batch form and resumes the run with the store reply; wire it via `AgentKernel` config `questions.questionStore`.

## 0.12.0

### Minor Changes

- Add live task-list support: durable `todo.updated` event (full snapshot),
  injectable `TodoStore` / `InMemoryTodoStore`, and a rewritten `todowrite` tool
  that supports whole-list replace, `activeForm`, preserved ordering, a single
  in-progress invariant, and full-snapshot return on every call.

## 0.11.0

### Minor Changes

- a9286a9: Hardening batch P5.10/P5.11 + Phase 6/7 (2026-10-11 → 2026-10-13), aligned by
  the `fixed: ["@vinhnt-sdk/*"]` changesets group.
  
  - **Features**: prompt-cache request shaping (`cache_control` / `prompt_cache_key`); per-step file snapshot → undo (opt-in `fileSnapshot`); permission modes (`default`/`acceptEdits`/`plan`/`bypass`/`auto`) + risk classifier + `PreCompact`/`SessionEnd` hooks; OTel `gen_ai.*` run tracing (opt-in OTLP); session event replay, `SerializedRunState` resume + session fork; `apply_patch` structured `*** Begin Patch` grammar; container sandbox backend (Docker, `--network none`); auto-memory + `MemoryService` search; MCP server dispatch + stdio server; workflow agent graphs; **new package `@vinhnt-sdk/tools-browser`** (browser/image-gen tools, driver-injected); A2A v1.0 Agent Card discovery (`/.well-known/agent-card.json`, ETag/304).
  - **Breaking (barrel/API hygiene, P5.9/P5.11)**: ~78 dead exports removed from package barrels; `@vinhnt-sdk/provider-spec` deleted; `plugin/npm-loader` removed from the SDK (library must not run `npm install`); `define-tool.ts` `any` types replaced with structural interfaces.
  - **Infra**: `scripts/check-docs-exports.mjs` + `scripts/check-dead-exports.mjs --gate` wired into `npm run lint`; AGENTS.md accuracy (22 packages).

## 0.1.1-beta.0

### Minor Changes

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
