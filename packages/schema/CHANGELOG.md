# @vinhnt-sdk/schema

## 0.23.1

No changes in this release.

## 0.23.0

No changes in this release.

## 0.22.0

### Minor Changes

- Add durable sub-agent run contracts, scoped memory, manual compaction, and MCP governance.
  
  - Run events carry `parentRunId`/`subAgent`, and the kernel can execute and settle sub-agent runs under a shared run tree.
  - Memory entries support scopes (workspace/project/session/user) with bounded recall and migration-safe session state.
  - Manual compaction and guardrail rejection are covered by kernel tests.
  - MCP tool mapping and governance filters are enforced at the provider boundary.

## 0.21.0

No changes in this release.

## 0.20.0

### Minor Changes

- 0ca6a58: Add a sandboxed `html` component to the generative-UI surface catalog (`ui.surface`). Self-contained HTML widgets are rendered by clients inside an iframe with an opaque origin and injected CSP; scripts only run when `allowScripts` is set. `render_ui` validates the 120k HTML size cap and height range.

## 0.19.0

### Minor Changes

- b476bec: Add MCP-style elicitation (structured human input) as a first-class HITL flow.
  
  - New durable events `elicitation.requested` / `elicitation.replied` plus
    `ElicitationRequestedData` / `ElicitationRepliedData` schemas and a flat,
    client-safe `ElicitationFieldSchema` (string/number/integer/boolean).
  - New `elicit` built-in tool (`createElicitTool`) and `ElicitationStore` /
    `InMemoryElicitationStore` seam; the kernel wires it via
    `elicitations: { elicitStore, elicitTimeoutMs }` and `ctx.askElicitation`.
  - The tool accepts `{ message, requestedSchema }` (form mode) or
    `{ message, mode: "url", url }` and returns
    `{ action: "accept" | "decline" | "cancel", content? }`.

## 0.18.0

### Minor Changes

- d9a75b9: Add an interactive `actions` component to the generative-UI catalog so surfaces
  can render clickable buttons that send a choice back to the agent.
  
  - `schema`: `UiSurfaceComponent` gains a `{ type: "actions", items }` variant +
    `UiSurfaceActionItem` (`{ id, label, tone?, value? }`) with matching Zod
    (`UiSurfaceActionItemSchema`, updated `UiSurfaceComponentSchema`).
  - `tools`: `render_ui` documents and validates the new `actions` component.
  
  The component is declarative only — clicking a button makes the client emit a
  `ui.action` message (`surfaceId` + action `id` + optional `value`); no code is
  ever evaluated.

## 0.17.0

### Minor Changes

- ffbffa5: Add the `ui.surface` generative-UI vertical: a durable, approved-catalog surface
  contract (`UiSurface` + `UiSurfaceComponent` schemas/types), the `ui.surface`
  event, `ToolContext.presentSurface`, and the built-in `render_ui` tool. The SDK
  only defines the contract + tool — consumers render against their own catalog
  (no code is ever evaluated).

## 0.16.0

### Minor Changes

- 8401a47: Expose the approval **scope** and ask **source** on permission requests.
  
  - `PermissionRequestedData` (event) and `PermissionRequest` (type) gain optional
    `scope?: readonly string[]` (the allow-rule patterns a `"always"` reply would
    persist) and `source?: string` (ask origin, e.g. `rules` | `risk`).
  - `PermissionGate` now forwards `savePatterns` and the ask source into the
    `permission.requested` event and the approval store request, so approval UIs
    can show the user exactly what "always allow" will cover.

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
