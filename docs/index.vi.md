---
title: vinhnt-sdk
description: SDK Agent AI cho TypeScript
lang: vi
type: concept
category: Getting Started
---

# Xây dựng agent AI với TypeScript

vinhnt-sdk là một SDK modular, có thể mở rộng để xây dựng agent AI trong TypeScript. Nó cung cấp 21 packages hoạt động cùng nhau để mang đến cho bạn bộ công cụ hoàn chỉnh để tạo, triển khai và quản lý các agent thông minh.

## vinhnt-sdk là gì?

vinhnt-sdk được thiết kế từ đầu cho các lập trình viên TypeScript. Nó cung cấp kiến trúc type-safe, có thể kết hợp, mở rộng từ nguyên mẫu đơn giản đến triển khai sản phẩm. Dù bạn đang xây dựng chatbot, agent tự động hóa, hay hệ thống multi-agent phức tạp, vinhnt-sdk cung cấp các khối xây dựng bạn cần.

### Các tính năng chính

- **Hệ thống Tool** - Định nghĩa và quản lý tool với schema type-safe và validation
- **Kiến trúc Plugin** - Mở rộng chức năng thông qua hệ thống plugin mạnh mẽ
- **Driven by Event** - Phản ứng đến các sự kiện lifecycle agent và sự kiện tùy chỉnh
- **Security-first** - Hệ thống permission tích hợp với phân loại risk-level
- **Observable** - Logging, metrics, và tracing toàn diện

## Cài đặt nhanh

```bash
pnpm add @vinhnt-sdk/core @vinhnt-sdk/tools @vinhnt-sdk/session @vinhnt-sdk/provider-openai-compatible zod
```

## Ví dụ 5 phút

```typescript
import { AgentKernel, defineTool } from '@vinhnt-sdk/core'
import { NullRunEventStore } from '@vinhnt-sdk/session'
import { OpenAICompatibleProvider } from '@vinhnt-sdk/provider-openai-compatible'
import { z } from 'zod'

const calculator = defineTool({
  name: 'calculator',
  description: 'Thực hiện tính toán cơ bản',
  risk: 'read',
  input: z.object({ expression: z.string().describe('Biểu thức toán học') }),
  async execute({ expression }) {
    return eval(expression)
  },
})

const kernel = new AgentKernel({
  model: new OpenAICompatibleProvider({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY!,
    defaultModel: 'gpt-4o-mini',
  }),
  store: new NullRunEventStore(),
  tools: [calculator.toDefinition()],
})

const handle = kernel.run('Tính 15 * 23', {
  requestId: 'req-1',
  traceId: 'trace-1',
  actorId: 'user-1',
  tenantId: 'default',
})
await handle.completed
```

## Bước tiếp theo

- [Bắt đầu](/docs/getting-started) - Thiết lập môi trường phát triển
- [Kiến trúc](/docs/architecture) - Hiểu thiết kế của SDK
- [Tham chiếu API](/docs/api) - Khám phá API hoàn chỉnh
- [Ví dụ](/docs/examples) - Xem các mẫu sử dụng thực tế

## Cộng đồng

Tham gia cộng đồng các nhà phát triển đang xây dựng thế hệ tiếp theo của agent AI. Báo lỗi, yêu cầu tính năng, và chia sẻ dự án của bạn trên GitHub.