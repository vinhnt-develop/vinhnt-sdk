---
title: "@vinhnt-sdk/knowledge"
description: "Bộ nhớ, nén ngữ cảnh và xây dựng prompt cho workflow agent"
version: "0.1.3"
lang: "vi"
type: "reference"
category: "API Reference"
sidebarLabel: "knowledge"
---

# @vinhnt-sdk/knowledge

Các tiện ích lưu trữ bộ nhớ, nén ngữ cảnh và xây dựng prompt để tạo các agent AI có trạng thái.

## Cài đặt

```bash
npm install @vinhnt-sdk/knowledge
```

## Các xuất (Exports)

### `InMemoryMemoryStore`

Triển khai bộ nhớ trong bộ đơn giản, phù hợp cho phiên đơn hoặc phát triển.

```ts
import { InMemoryMemoryStore } from "@vinhnt-sdk/knowledge";

const store = new InMemoryMemoryStore();
await store.write({ id: "m1", tier: "episodic", content: "Người dùng thích chế độ tối" });
const items = await store.read("episodic");
```

**Phương thức:**
- `write(item: MemoryItem): Promise<void>` — Lưu một mục bộ nhớ.
- `read(tier: MemoryTier): Promise<MemoryItem[]>` — Lấy tất cả mục trong một tầng.
- `clear(tier?: MemoryTier): Promise<void>` — Xóa mục trong một tầng, hoặc tất cả nếu bỏ trống.

---

### `BoundedMemory`

Bọc bộ nhớ với giới hạn ngân sách (số lượng mục tối đa hoặc theo token) cho mỗi tầng. Tự động xóa mục cũ khi vượt quá giới hạn.

```ts
import { BoundedMemory, InMemoryMemoryStore } from "@vinhnt-sdk/knowledge";

const store = new InMemoryMemoryStore();
const memory = new BoundedMemory(store, { maxItems: 100, maxTokensPerTier: 4096 });

await memory.write({ id: "m1", tier: "episodic", content: "..." });
```

**Constructor:** `BoundedMemory(store: MemoryStore, options: BoundedMemoryOptions)`

**Tùy chọn:**
- `maxItems?: number` — Số lượng mục tối đa mỗi tầng.
- `maxTokensPerTier?: number` — Số token tối đa mỗi tầng (dùng `approximateTokens`).
- `evictionPolicy?: "oldest" | "largest"` — Chiến lược xóa khi vượt giới hạn.

---

### `ContextCompressor`

Trình nén hội thoại dựa trên quy tắc, giữ lại tin nhắn đầu và cuối trong khi tóm tắt phần giữa. Hữu ích để vừa vặn hội thoại trong cửa sổ ngữ cảnh.

```ts
import { ContextCompressor } from "@vinhnt-sdk/knowledge";

const compressor = new ContextCompressor({
  maxTokens: 4096,
  headMessages: 2,
  tailMessages: 4,
});

const compressed = await compressor.compress(conversation);
// Trả về { messages: [...], summary: "...", originalTokens: 8000, compressedTokens: 3800 }
```

**Constructor:** `ContextCompressor(options: CompressorOptions)`

**Phương thức:**
- `compress(messages: Message[]): Promise<CompressionSummary>` — Nén tin nhắn để vừa với giới hạn token.

---

### `LlmCompactor`

Trình nén hội thoại sử dụng mô hình ngôn ngữ lớn để tạo tóm tắt thông minh phần giữa của cuộc trò chuyện.

```ts
import { LlmCompactor } from "@vinhnt-sdk/knowledge";

const compressor = new LlmCompactor({
  maxTokens: 4096,
  headMessages: 2,
  tailMessages: 4,
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
});

const result = await compressor.compress(conversation);
```

**Constructor:** `LlmCompactor(options: LlmCompactorOptions)`

**Tùy chọn bổ sung (mở rộng `CompressorOptions`):**
- `model: string` — Mã định danh mô hình LLM.
- `apiKey: string` — Khóa API cho nhà cung cấp LLM.
- `baseUrl?: string` — URL cơ sở API tùy chỉnh.
- `systemPrompt?: string` — Prompt tóm tắt tùy chỉnh.

---

### `buildPrompt`

Xây dựng chuỗi prompt từ mảng tin nhắn và cấu hình tùy chọn.

```ts
import { buildPrompt } from "@vinhnt-sdk/knowledge";

const prompt = buildPrompt(messages, {
  systemMessage: "Bạn là trợ lý hữu ích.",
  maxTokens: 4096,
  tokenBudget: 2048,
});
```

**Ký hiệu:** `buildPrompt(messages: Message[], options?: BuildPromptOptions): string`

**Tùy chọn:**
- `systemMessage?: string` — Prompt hệ thống được thêm vào đầu.
- `maxTokens?: number` — Giới hạn token cứng cho đầu ra.
- `tokenBudget?: number` — Ngân sách mềm; cắt tin nhắn cũ nếu vượt quá.

---

### `approximateTokens`

Ước tính số token cho văn bản bằng phương pháp ước tính dựa trên ký tự.

```ts
import { approximateTokens } from "@vinhnt-sdk/knowledge";

const tokens = approximateTokens("Xin chào, thế giới!"); // ~4
const tokens2 = approximateTokens(text, 3.5);              // tỷ lệ ký tự/token tùy chỉnh
```

**Ký hiệu:** `approximateTokens(text: string, charsPerToken?: number): number`

Giá trị mặc định `charsPerToken` là `4`.

---

## Các kiểu dữ liệu

### `MemoryTier`

Kiểu chuỗi mở đại diện cho phân loại tầng bộ nhớ.

```ts
type MemoryTier = string;
// Các giá trị phổ biến: "episodic", "semantic", "procedural", "working"
```

### `MemoryItem`

Đại diện cho một mục bộ nhớ được lưu trữ.

```ts
interface MemoryItem {
  id: string;
  tier: MemoryTier;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### `MemoryStore`

Giao diện cho các triển khai lưu trữ bộ nhớ.

```ts
interface MemoryStore {
  write(item: MemoryItem): Promise<void>;
  read(tier: MemoryTier): Promise<MemoryItem[]>;
  clear(tier?: MemoryTier): Promise<void>;
}
```

### `CompressorOptions`

Cấu hình cho `ContextCompressor`.

```ts
interface CompressorOptions {
  maxTokens: number;
  headMessages?: number;
  tailMessages?: number;
  separator?: string;
}
```

### `LlmCompactorOptions`

Cấu hình cho `LlmCompactor` (mở rộng `CompressorOptions`).

```ts
interface LlmCompactorOptions extends CompressorOptions {
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt?: string;
  temperature?: number;
}
```

### `ConversationCompactor`

Giao diện chung cho cả hai triển khai trình nén.

```ts
interface ConversationCompactor {
  compress(messages: Message[]): Promise<CompressionSummary>;
}
```

### `CompressionSummary`

Kết quả của thao tác nén.

```ts
interface CompressionSummary {
  messages: Message[];
  summary: string;
  originalTokens: number;
  compressedTokens: number;
  removedCount: number;
}
```

## Phụ thuộc

- `@vinhnt-sdk/schema` — Định nghĩa kiểu Message và content.
- `@vinhnt-sdk/tools` (tùy chọn) — Cần thiết khi sử dụng nén nhận biết tool-call.
