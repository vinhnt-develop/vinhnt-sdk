---
title: "Cấu hình"
description: "Cấu hình agent của bạn"
lang: "vi"
type: "guide"
category: "Guides"
sidebarPosition: 3
---

# Cấu hình

vinhnt-sdk là một thư viện, không phải ứng dụng. Không có tệp cấu hình hay thư mục cấu hình. Bạn cấu hình agent bằng cách truyền đối số vào constructor.

## Cấu hình Kernel

Lớp `Kernel` chấp nhận đối tượng cấu hình định nghĩa hành vi của agent:

```typescript
import { Kernel } from "vinhnt-sdk";

const kernel = new Kernel({
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: "Bạn là trợ lý hữu ích.",
  tools: [],
  plugins: [],
});
```

## Biến môi trường

Sử dụng gói `config` để tải biến môi trường với kiểm soát kiểu dữ liệu:

```typescript
import config from "config";

interface AppConfig {
  apiKey: string;
  baseUrl: string;
  debug: boolean;
}

const appConfig = config.get<AppConfig>("app");
```

## Schema tùy chỉnh với Zod

Xác thực cấu hình tại thời điểm chạy bằng schema Zod:

```typescript
import { z } from "zod";

const ConfigSchema = z.object({
  apiKey: z.string().min(1),
  model: z.enum(["gpt-4", "gpt-3.5-turbo"]),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().positive(),
});

type Config = z.infer<typeof ConfigSchema>;

const validatedConfig = ConfigSchema.parse(rawConfig);
```

## Giải quyết chứng từ 4 lớp

Chứng từ được giải quyết theo thứ tự sau (ưu tiên cao nhất trước):

| Lớp | Nguồn | Ưu tiên |
|-----|-------|---------|
| 1 | Tùy chọn constructor | Cao nhất |
| 2 | Biến môi trường | Cao |
| 3 | Tệp cấu hình | Trung bình |
| 4 | Giá trị mặc định | Thấp nhất |

```typescript
// Lớp 1: Constructor có ưu tiên cao nhất
const kernel = new Kernel({
  apiKey: process.env.API_KEY, // Dự phòng lớp 2
});
```

## Hệ thống không gian tên Settings

Tổ chức cài đặt bằng không gian tên để tránh xung đột:

```typescript
const kernel = new Kernel({
  settings: {
    "llm.openai": { apiKey: "...", model: "gpt-4" },
    "llm.anthropic": { apiKey: "...", model: "claude-3" },
    "storage.redis": { url: "redis://localhost" },
    "logging.level": "info",
  },
});
```

## Thứ tự ưu tiên cấu hình

Khi nhiều nguồn cấu hình tồn tại, giá trị được hợp nhất với thứ tự ưu tiên sau:

1. **Ghi đè runtime** — truyền trực tiếp vào lệnh gọi phương thức
2. **Tùy chọn constructor** — cấu hình tĩnh cấp cao nhất
3. **Cài đặt namespace** — ghi đè theo tính năng
4. **Biến môi trường** — cấu hình cấp hệ thống
5. **Giá trị mặc định** — dự phòng tích hợp sẵn

```typescript
// Ghi đè runtime có ưu tiên cao nhất
const response = await kernel.chat(messages, {
  temperature: 0.2, // Ghi đè cấu hình constructor
});
```

Luôn xác thực cấu hình khi khởi động để phát hiện lỗi sớm. Sử dụng schema Zod để xác thực thời điểm chạy và kiểu TypeScript để kiểm tra thời điểm biên dịch.
