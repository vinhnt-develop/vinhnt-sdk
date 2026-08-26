---
title: "@vinhnt-sdk/sandbox"
description: "Cô lập tiến trình và phân tích lệnh"
lang: vi
type: "reference"
category: "API Reference"
sidebarLabel: sandbox
version: "0.1.3"
---

# @vinhnt-sdk/sandbox

Cô lập tiến trình và phân tích lệnh shell cho môi trường thực thi an toàn.

## Xuất (Exports)

### `createSandbox(config)`

Tạo instance sandbox cô lập để thực thi lệnh.

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

**Tham số:**

- `config.workingDirectory` — Thư mục làm việc cho lệnh
- `config.timeout` — Thời gian chờ mặc định (ms) (mặc định: 30000)
- `config.env` — Biến môi trường bổ sung
- `config.allowNetwork` — Cho phép truy cập mạng (mặc định: false)
- `config.maxBufferSize` — Kích thước bộ đệm stdout/stderr tối đa (mặc định: 10MB)

**Trả về:** `SandboxFactory` — đối tượng có phương thức `execute()` và `executeStream()`.

### `killProcessTree(child, signal, timeoutMs)`

Tiêu diệt cây tiến trình cross-platform. Gửi tín hiệu đến toàn bộ nhóm tiến trình.

```ts
import { killProcessTree } from "@vinhnt-sdk/sandbox";

const child = spawn("sh", ["-c", "sleep 100"]);
await killProcessTree(child, "SIGTERM", 5000);
```

**Tham số:**

- `child` — Instance tiến trình con
- `signal` — Tín hiệu gửi: `"SIGTERM"` | `"SIGKILL"` | `"SIGINT"`
- `timeoutMs` — Thời gian chờ trước khi force kill (mặc định: 5000)

**Trả về:** `Promise<void>`

### `killProcessTreeAndWait(child, signal, timeoutMs)`

Tiêu diệt cây tiến trình và chờ tiến trình thoát.

```ts
import { killProcessTreeAndWait } from "@vinhnt-sdk/sandbox";

const child = spawn("sh", ["-c", "echo done"]);
await killProcessTreeAndWait(child, "SIGTERM", 3000);
// Tiến trình đảm bảo đã thoát
```

**Tham số:**

- `child` — Instance tiến trình con
- `signal` — Tín hiệu gửi
- `timeoutMs` — Thời gian chờ trước khi force kill (mặc định: 5000)

**Trả về:** `Promise<{ code: number | null, signal: string | null }>`

### `treeKillSpawnOptions()`

Lấy tùy chọn spawn được cấu hình để hỗ trợ tiêu diệt cây tiến trình.

```ts
import { treeKillSpawnOptions } from "@vinhnt-sdk/sandbox";
import { spawn } from "child_process";

const child = spawn("bash", ["-c", "echo hello"], treeKillSpawnOptions());
```

**Trả về:** `SpawnOptions` với cờ detached và cấu hình stdio.

### `parseCommand(command)`

Phân tích chuỗi lệnh shell thành các thành phần có cấu trúc.

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

**Tham số:**

- `command` — Chuỗi lệnh shell thô

**Trả về:** `CommandParseResult`

## Kiểu dữ liệu

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

## Phụ thuộc

- `@vinhnt-sdk/schema` — Validation và định nghĩa kiểu JSON Schema
