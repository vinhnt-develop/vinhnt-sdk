# @vinhnt-sdk/sandbox

Sandbox primitives + fail-closed factory for isolated tool/command execution.

```typescript
import { createSandbox, SandboxUnavailableError, createHostSandbox, createProcessSandbox } from "@vinhnt-sdk/sandbox";

const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "process" }, {
  host: createHostSandbox,
  process: createProcessSandbox,
});

const result = await sandbox.execute({
  command: "node ./script.js",
  cwd: "/workspace",
  timeoutMs: 30_000,
});
```

## Fail-closed by default

Requesting a sandbox scope that has no registered backend throws
`SandboxUnavailableError` — it never silently downgrades to a weaker sandbox.
Wire only the backends your application actually supports.

## Contents

- `ProcessSandbox` interface — `execute()` / `destroy()` contract.
- `SandboxConfig`, `SandboxResult`, `SandboxScope`, `KNOWN_SANDBOX_SCOPES`.
- `SandboxUnavailableError` — fail-closed error carrying the missing scope.
- `createSandbox(config, backends)` — fail-closed factory.
- `parseCommand` — shell command tokenizer.
- `killProcessTree` / `isPidAlive` / `treeKillSpawnOptions` — tree-scoped termination.
- Backend factories in-package: `createHostSandbox` (host), `createProcessSandbox` (process), `createContainerSandbox` (container/Docker — G17).
- Container scope: `allowNetwork: false` → `--network none`; `metadata.egressProxyUrl` injects an allowlisting proxy; missing docker CLI fails closed (exit 127), never downgrades.