---
"@vinhnt-sdk/schema": minor
"@vinhnt-sdk/tools": minor
---

Add a sandboxed `html` component to the generative-UI surface catalog (`ui.surface`). Self-contained HTML widgets are rendered by clients inside an iframe with an opaque origin and injected CSP; scripts only run when `allowScripts` is set. `render_ui` validates the 120k HTML size cap and height range.
