# @vinhnt-sdk/sandbox-container

Container sandbox backend for `@vinhnt-sdk/sandbox`.

**Fail-closed**: a real container runtime adapter is not wired yet, so any
`execute()` call throws `SandboxUnavailableError`. There is deliberately **no
silent downgrade** to the host/process sandbox — requesting container isolation
when it cannot be honoured is an explicit error, never a silent weakening.

```typescript
import { createSandbox } from "@vinhnt-sdk/sandbox";
import { createContainerSandbox } from "@vinhnt-sdk/sandbox-container";

// Wiring the container backend is allowed...
const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "container" }, {
  container: createContainerSandbox,
});

// ...but execution is fail-closed until a real runtime adapter exists.
await sandbox.execute({ command: "node ./app.js", cwd: ".", timeoutMs: 30_000 });
// throws SandboxUnavailableError
```

To implement a real container adapter, provide a `ProcessSandbox` with
`scope === "container"` and pass it through the `@vinhnt-sdk/sandbox` backends map.