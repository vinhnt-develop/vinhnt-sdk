---
"@vinhnt-sdk/schema": minor
"@vinhnt-sdk/tools": minor
---

Add an interactive `actions` component to the generative-UI catalog so surfaces
can render clickable buttons that send a choice back to the agent.

- `schema`: `UiSurfaceComponent` gains a `{ type: "actions", items }` variant +
  `UiSurfaceActionItem` (`{ id, label, tone?, value? }`) with matching Zod
  (`UiSurfaceActionItemSchema`, updated `UiSurfaceComponentSchema`).
- `tools`: `render_ui` documents and validates the new `actions` component.

The component is declarative only — clicking a button makes the client emit a
`ui.action` message (`surfaceId` + action `id` + optional `value`); no code is
ever evaluated.
