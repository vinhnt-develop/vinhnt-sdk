---
"@vinhnt-sdk/schema": minor
"@vinhnt-sdk/step-executor": minor
---

Expose the approval **scope** and ask **source** on permission requests.

- `PermissionRequestedData` (event) and `PermissionRequest` (type) gain optional
  `scope?: readonly string[]` (the allow-rule patterns a `"always"` reply would
  persist) and `source?: string` (ask origin, e.g. `rules` | `risk`).
- `PermissionGate` now forwards `savePatterns` and the ask source into the
  `permission.requested` event and the approval store request, so approval UIs
  can show the user exactly what "always allow" will cover.
