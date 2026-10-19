---
"@vinhnt-sdk/schema": minor
"@vinhnt-sdk/event": minor
"@vinhnt-sdk/tools": minor
"@vinhnt-sdk/step-executor": minor
"@vinhnt-sdk/core": minor
---

Add the `ui.surface` generative-UI vertical: a durable, approved-catalog surface
contract (`UiSurface` + `UiSurfaceComponent` schemas/types), the `ui.surface`
event, `ToolContext.presentSurface`, and the built-in `render_ui` tool. The SDK
only defines the contract + tool — consumers render against their own catalog
(no code is ever evaluated).
