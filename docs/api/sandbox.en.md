---
title: "@vinhnt-sdk/sandbox"
description: "Process isolation and command parsing"
lang: en
type: "reference"
category: "API Reference"
sidebarLabel: sandbox
version: "0.1.3"
---

# @vinhnt-sdk/sandbox

Process isolation and shell command parsing for safe execution environments.

## Exports

### `createSandbox(config)`

Create an isolated sandbox instance for command execution.

```ts
import { createSandbox } from "@vinhnt-sdk/sandbox";

const sandbox = createSandbox({
  workingDirectory: "/tmp/workspace",
  timeout: 30000,
  env: { PATH: "/usr/bin:/bin" },
  allowNetwork: false,
});

const result = await sandbox.execute("ls -la");
console.log(result.stdout);
```

**Parameters:**

- `config.workingDirectory` — Working directory for commands
- `config.timeout` — Default timeout in milliseconds (default: 30000)
- `config.env` — Additional environment variables
- `config.allowNetwork` — Whether to allow network access (default: false)
- `config.maxBufferSize` — Max stdout/stderr buffer size (default: 10MB)

**Returns:** `SandboxFactory` — object with `execute()` and `executeStream()` methods.

### `killProcessTree(child, signal, timeoutMs)`

Cross-platform process tree kill. Sends signal to the entire process group.

```ts
import { killProcessTree } from "@vinhnt-sdk/sandbox";

const child = spawn("sh", ["-c", "sleep 100"]);
await killProcessTree(child, "SIGTERM", 5000);
```

**Parameters:**

- `child` — Child process instance
- `signal` — Signal to send: `"SIGTERM"` | `"SIGKILL"` | `"SIGINT"`
- `timeoutMs` — Timeout before force kill (default: 5000)

**Returns:** `Promise<void>`

### `killProcessTreeAndWait(child, signal, timeoutMs)`

Kill process tree and wait for process to exit.

```ts
import { killProcessTreeAndWait } from "@vinhnt-sdk/sandbox";

const child = spawn("sh", ["-c", "echo done"]);
await killProcessTreeAndWait(child, "SIGTERM", 3000);
// Process is guaranteed to have exited
```

**Parameters:**

- `child` — Child process instance
- `signal` — Signal to send
- `timeoutMs` — Timeout before force kill (default: 5000)

**Returns:** `Promise<{ code: number | null, signal: string | null }>`

### `treeKillSpawnOptions()`

Get spawn options configured for process tree kill support.

```ts
import { treeKillSpawnOptions } from "@vinhnt-sdk/sandbox";
import { spawn } from "child_process";

const child = spawn("bash", ["-c", "echo hello"], treeKillSpawnOptions());
```

**Returns:** `SpawnOptions` with detached flag and stdio configuration.

### `parseCommand(command)`

Parse a shell command string into structured components.

```ts
import { parseCommand } from "@vinhnt-sdk/sandbox";

const parsed = parseCommand("git commit -m 'initial commit'");
// {
//   command: "git",
//   args: ["commit", "-m", "initial commit"],
//   env: {},
//   redirections: []
// }
```

**Parameters:**

- `command` — Raw shell command string

**Returns:** `CommandParseResult`

## Types

### `SandboxConfig`

```ts
interface SandboxConfig {
  workingDirectory?: string;
  timeout?: number;
  env?: Record<string, string>;
  allowNetwork?: boolean;
  maxBufferSize?: number;
  shell?: string;
}
```

### `SandboxResult`

```ts
interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  duration: number;
}
```

### `SandboxFactory`

```ts
interface SandboxFactory {
  execute(command: string, options?: ExecuteOptions): Promise<SandboxResult>;
  executeStream(command: string, options?: ExecuteOptions): AsyncIterable<StreamChunk>;
  kill(): void;
}
```

### `CommandParseResult`

```ts
interface CommandParseResult {
  command: string;
  args: string[];
  env: Record<string, string>;
  redirections: Redirection[];
}
```

## Dependencies

- `@vinhnt-sdk/schema` — JSON Schema validation and type definitions
