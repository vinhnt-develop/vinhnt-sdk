# @vinhnt-sdk/sandbox-process

Process-isolation sandbox backend for `@vinhnt-sdk/sandbox`. Enforces a command
allowlist (with blocked dangerous patterns), runs with an empty environment by
default (only explicitly allowed vars), and can add Node.js Permission Model
flags for `node` commands.

Unlisted commands are rejected with exit code 126 — no silent fallback.

```typescript
import { createSandbox } from "@vinhnt-sdk/sandbox";
import { createProcessSandbox } from "@vinhnt-sdk/sandbox-process";

const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "process" }, {
  process: createProcessSandbox,
});
```