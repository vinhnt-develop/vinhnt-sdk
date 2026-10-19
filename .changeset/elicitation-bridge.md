---
"@vinhnt-sdk/schema": minor
"@vinhnt-sdk/event": minor
"@vinhnt-sdk/tools": minor
"@vinhnt-sdk/step-executor": minor
"@vinhnt-sdk/core": minor
"@vinhnt-sdk/trace": minor
---

Add MCP-style elicitation (structured human input) as a first-class HITL flow.

- New durable events `elicitation.requested` / `elicitation.replied` plus
  `ElicitationRequestedData` / `ElicitationRepliedData` schemas and a flat,
  client-safe `ElicitationFieldSchema` (string/number/integer/boolean).
- New `elicit` built-in tool (`createElicitTool`) and `ElicitationStore` /
  `InMemoryElicitationStore` seam; the kernel wires it via
  `elicitations: { elicitStore, elicitTimeoutMs }` and `ctx.askElicitation`.
- The tool accepts `{ message, requestedSchema }` (form mode) or
  `{ message, mode: "url", url }` and returns
  `{ action: "accept" | "decline" | "cancel", content? }`.
