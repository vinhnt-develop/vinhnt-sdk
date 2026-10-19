# @vinhnt-sdk/step-executor

## 0.14.0

### Minor Changes

- 83d6536: Permission replies can carry a user-supplied reason (additive, non-breaking).
  
  - `schema`: new `ApprovalReply { reply, reason? }` type; `permission.replied` event data gains an optional `reason`.
  - `permission`: `ApprovalStore.awaitReplyWithReason?()` (optional) and `resolveRequest(id, reply, reason?)`; `InMemoryApprovalStore` records and returns the reason. `awaitReply` keeps returning the decision only.
  - `tools`: `ToolContext.ask` input gains an optional `onReply(reply, reason?)` observer so hosts can read feedback without changing the return type.
  - `step-executor`: `PermissionGate.askForTool` accepts `onReply`; the reject reason is emitted on `permission.replied` and fed back to the model in the rejection tool result.

### Patch Changes

- Updated dependencies [83d6536]
  - @vinhnt-sdk/schema@0.14.0
  - @vinhnt-sdk/permission@0.14.0
  - @vinhnt-sdk/tools@0.14.0
  - @vinhnt-sdk/event@0.14.0
  - @vinhnt-sdk/guard@0.14.0
  - @vinhnt-sdk/llm@0.14.0
  - @vinhnt-sdk/session@0.14.0

## 0.13.0

### Minor Changes

- 5b3ecb6: feat(tools): human-in-the-loop `question` tool — durable `question.requested` / `question.replied` events, injectable `QuestionStore` (+ `InMemoryQuestionStore`), and `ToolContext.askQuestion` for block-await-resume. The `question` tool now supports a 1–4 item batch form and resumes the run with the store reply; wire it via `AgentKernel` config `questions.questionStore`.

### Patch Changes

- Updated dependencies [5b3ecb6]
  - @vinhnt-sdk/tools@0.13.0
  - @vinhnt-sdk/schema@0.13.0
  - @vinhnt-sdk/event@0.13.0
  - @vinhnt-sdk/llm@0.13.0
  - @vinhnt-sdk/guard@0.13.0
  - @vinhnt-sdk/permission@0.13.0
  - @vinhnt-sdk/session@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/schema@0.12.0
  - @vinhnt-sdk/event@0.12.0
  - @vinhnt-sdk/tools@0.12.0
  - @vinhnt-sdk/guard@0.12.0
  - @vinhnt-sdk/llm@0.12.0
  - @vinhnt-sdk/permission@0.12.0
  - @vinhnt-sdk/session@0.12.0

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
  - @vinhnt-sdk/llm@0.11.0
  - @vinhnt-sdk/permission@0.11.0
  - @vinhnt-sdk/schema@0.11.0
  - @vinhnt-sdk/session@0.11.0
  - @vinhnt-sdk/tools@0.11.0
