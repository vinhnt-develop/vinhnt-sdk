# @vinhnt-sdk/permission

Permission kernel primitive for VNT Agent — decoupled from core.

Owns the permission rule model and matching semantics, plus approval stores.
The gate (`PermissionGate`) stays in host packages and consumes this package.

```typescript
import { buildPermissionRules, evaluatePermission } from "@vinhnt-sdk/permission";

const rules = buildPermissionRules({ "edit": "allow", "bash": { "*": "ask", "git diff": "allow" } });
const result = evaluatePermission({ rules }, "bash.run", { command: "git diff" });
```

## Features

- `PermissionRule` / `PermissionEffect` / `PermissionRuleset` — rule model (action/resource/effect).
- `matchPermission` / `buildPermissionRules` — last-match-wins glob matching with nested context patterns.
- `normalizePermissions` / `mergeRulesets` / `resolveEffectivePermissions` / `evaluatePermission` / `checkRiskAllowed` — agent permission normalization and evaluation (default: `ask` — safe).
- `PermissionStore` / `ApprovalStore` / `InMemoryApprovalStore` — saved rules, approval request tracking.
- Re-exports the permission contract types (`PermissionRequest`, `PermissionReply`, `SavedApproval`) from `@vinhnt-sdk/schema`.

Depends only on `@vinhnt-sdk/schema`.