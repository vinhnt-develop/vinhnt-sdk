---
"@vinhnt-sdk/schema": minor
"@vinhnt-sdk/permission": minor
"@vinhnt-sdk/step-executor": minor
"@vinhnt-sdk/tools": minor
---

Permission replies can carry a user-supplied reason (additive, non-breaking).

- `schema`: new `ApprovalReply { reply, reason? }` type; `permission.replied` event data gains an optional `reason`.
- `permission`: `ApprovalStore.awaitReplyWithReason?()` (optional) and `resolveRequest(id, reply, reason?)`; `InMemoryApprovalStore` records and returns the reason. `awaitReply` keeps returning the decision only.
- `tools`: `ToolContext.ask` input gains an optional `onReply(reply, reason?)` observer so hosts can read feedback without changing the return type.
- `step-executor`: `PermissionGate.askForTool` accepts `onReply`; the reject reason is emitted on `permission.replied` and fed back to the model in the rejection tool result.
