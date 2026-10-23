# @vinhnt-sdk/event

## 0.22.0

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/schema@0.22.0

## 0.21.0

### Patch Changes

- @vinhnt-sdk/schema@0.21.0

## 0.20.0

### Patch Changes

- Updated dependencies [0ca6a58]
  - @vinhnt-sdk/schema@0.20.0

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

### Patch Changes

- Updated dependencies [b476bec]
  - @vinhnt-sdk/schema@0.19.0

## 0.18.0

### Patch Changes

- Updated dependencies [d9a75b9]
  - @vinhnt-sdk/schema@0.18.0

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

## 0.16.0

### Patch Changes

- Updated dependencies [8401a47]
  - @vinhnt-sdk/schema@0.16.0

## 0.15.0

### Minor Changes

- Add a durable plan-approval (HITL) vertical: `plan.requested` / `plan.replied` events, the `submit_plan` tool + `PlanApprovalStore` in `@vinhnt-sdk/tools`, `ctx.askPlan` in `@vinhnt-sdk/step-executor`, and `AgentKernelConfig.plans` wiring in `@vinhnt-sdk/core`. The agent can present a plan and block until the user approves, requests changes, or cancels.

### Patch Changes

- Updated dependencies
  - @vinhnt-sdk/schema@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [83d6536]
  - @vinhnt-sdk/schema@0.14.0

## 0.13.0

### Minor Changes

- 5b3ecb6: feat(tools): human-in-the-loop `question` tool — durable `question.requested` / `question.replied` events, injectable `QuestionStore` (+ `InMemoryQuestionStore`), and `ToolContext.askQuestion` for block-await-resume. The `question` tool now supports a 1–4 item batch form and resumes the run with the store reply; wire it via `AgentKernel` config `questions.questionStore`.

### Patch Changes

- Updated dependencies [5b3ecb6]
  - @vinhnt-sdk/schema@0.13.0

## 0.12.0

### Minor Changes

- Add live task-list support: durable `todo.updated` event (full snapshot),
  injectable `TodoStore` / `InMemoryTodoStore`, and a rewritten `todowrite` tool
  that supports whole-list replace, `activeForm`, preserved ordering, a single
  in-progress invariant, and full-snapshot return on every call.

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
