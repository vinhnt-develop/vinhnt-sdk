---
title: Mẫu thiết kế
description: Các mẫu thiết kế trong vinhnt-sdk
lang: vi
type: concept
category: Architecture
sidebarPosition: 3
---

# Mẫu thiết kế

Tài liệu này mô tả các mẫu thiết kế cốt lõi được sử dụng trong toàn bộ codebase `vinhnt-sdk`. Mỗi mẫu bao gồm mô tả, hướng dẫn sử dụng, ví dụ code và anti-pattern cần tránh.

---

## 1. Capability Seam

**Mô tả:** Tách biệt định nghĩa service khỏi triển khai thông qua hợp đồng Provider/Consumer. Định nghĩa khai báo khả năng, provider triển khai, và consumer chỉ phụ thuộc vào interface.

**Khi nào dùng:** Khi bạn cần các backend có thể thay thế (ví dụ: LLM provider, storage backend, transport layer).

```
Service Definition → Provider → Consumer
```

```ts
// Định nghĩa
interface LlmAdapter {
  chat(params: ChatParams): Promise<ChatResult>;
}

// Provider
class OpenAICompatibleProvider implements LlmAdapter {
  async chat(params: ChatParams): Promise<ChatResult> {
    // triển khai
  }
}

// Consumer
class AgentKernel {
  constructor(private llm: LlmAdapter) {}
  async run(prompt: string) {
    return this.llm.chat({ messages: [{ role: "user", content: prompt }] });
  }
}
```

**Anti-pattern:** Import trực tiếp concrete provider trong consumer code. Luôn phụ thuộc vào interface.

---

## 2. Branded Types

**Mô tả:** Tạo các ID type-safe sử dụng `BrandedId<T>` để ngăn ngừa việc trộn lẫn các loại ID khác nhau tại thời điểm biên dịch.

**Khi nào dùng:** Khi bạn có nhiều ID kiểu string không được phép hoán đổi cho nhau.

```ts
type RunId = BrandedId<"RunId">;
type SessionId = BrandedId<"SessionId">;

function getRun(id: RunId) { /* ... */ }

const runId = "run_abc" as RunId;
const sessionId = "sess_xyz" as SessionId;

getRun(runId);      // OK
getRun(sessionId);  // Lỗi biên dịch — các loại khác nhau
```

**Anti-pattern:** Sử dụng `string` thuần cho ID. Bạn mất đi sự an toàn biên dịch và dễ gây bug runtime.

---

## 3. Open vs Strict Unions

**Mô tả:** Chọn giữa strict literal union và open string type tùy thuộc vào việc domain có mở hay đóng.

**Khi nào dùng — Strict:** State machine nội bộ nơi không cần mở rộng từ bên ngoài.

```ts
type CircuitState = "closed" | "open" | "half_open";

function transition(state: CircuitState): CircuitState {
  // xử lý exhaustive được đảm bảo
}
```

**Khi nào dùng — Open:** API hướng plugin nơi bên thứ ba có thể thêm giá trị tùy chỉnh.

```ts
type ToolRisk = string;

const builtIn: ToolRisk = "read";
const pluginRisk: ToolRisk = "custom_network_call"; // hợp lệ
```

**Anti-pattern:** Sử dụng open union cho state machine nội bộ — bạn mất khả năng kiểm tra exhaustive trong switch.

---

## 4. Extensible Metadata

**Mô tả:** Thêm túi `metadata` tùy chọn (`Record<string, unknown>`) vào các type có thể cần thêm trường trong tương lai mà không phá vỡ thay đổi.

**Khi nào dùng:** Trên các type面向 công khai như `Run`, `Session`, `ToolDefinition` nơi plugin hoặc consumer gắn dữ liệu bổ sung.

```ts
interface Run {
  id: RunId;
  status: RunStatus;
  metadata?: Record<string, unknown>;
}

// Consumer gắn dữ liệu tùy chỉnh
const run = await kernel.startRun({ prompt: "hello" });
await kernel.updateRun(run.id, {
  metadata: { ...run.metadata, myPluginVersion: "1.2.0" },
});
```

**Anti-pattern:** Thêm các trường bắt buộc vào type chia sẻ cho mỗi tính năng mới — điều này phá vỡ các consumer hiện tại.

---

## 5. Named Exports Only

**Mô tả:** Barrel file (`index.ts`) chỉ sử dụng named export. Không dùng `export *` để giữ bề mặt API công khai được kiểm soát và dự đoán được.

**Khi nào dùng:** Trong mọi barrel file trên toàn SDK.

```ts
// packages/core/src/index.ts
export { AgentKernel } from "./agent-kernel";
export type { AgentKernelConfig } from "./agent-kernel";
export { VntError } from "./errors";
export type { RunId, SessionId } from "./branded-types";
```

**Anti-pattern:** `export * from "./internal"` — làm mọi symbol internal trở thành public và ngăn cản tree-shaking.

---

## 6. Error Hierarchy

**Mô tả:** Tất cả lỗi SDK đều mở rộng `VntError` với `code` có thể đọc được bởi máy và cờ `retryable` cho logic tự động retry.

**Khi nào dùng:** Cho mọi lỗi mà SDK có thể throw. Luôn mở rộng `VntError`, không bao giờ throw `Error` thuần.

```ts
class VntError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

class RateLimitError extends VntError {
  constructor(retryAfterMs: number) {
    super(`Bị giới hạn tốc độ, thử lại sau ${retryAfterMs}ms`, "RATE_LIMITED", true);
    this.retryAfterMs = retryAfterMs;
  }
}

class InvalidInputError extends VntError {
  constructor(detail: string) {
    super(`Đầu vào không hợp lệ: ${detail}`, "INVALID_INPUT", false);
  }
}
```

**Anti-pattern:** Throw `Error` hoặc `TypeError` chung — consumer không thể phân biệt programmatic giữa lỗi SDK và lỗi khác.

---

## Tóm tắt

| Mẫu | Ý tưởng cốt lõi |
|---|---|
| Capability Seam | Interface → Provider → Consumer |
| Branded Types | `BrandedId<T>` cho ID type-safe |
| Open vs Strict Unions | Literal đóng vs string mở |
| Extensible Metadata | `metadata?: Record<string, unknown>` |
| Named Exports Only | Không dùng `export *` |
| Error Hierarchy | `VntError` cơ sở với `code` + `retryable` |
