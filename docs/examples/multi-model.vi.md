---
title: "Multi-Model"
description: "Định tuyến giữa nhiều nhà cung cấp và mô hình LLM"
lang: "vi"
type: "example"
category: "Examples"
sidebarPosition: 4
---

# Định tuyến Multi-Model

Cấu hình nhiều nhà cung cấp, định tuyến yêu cầu dựa trên loại tác vụ và triển khai chiến lược dự phòng để tối ưu hóa chi phí và độ tin cậy.

## Tổng quan

Ví dụ này hướng dẫn cách:

- Đăng ký nhiều nhà cung cấp LLM (DeepSeek, OpenAI, Ollama)
- Định tuyến yêu cầu đến mô hình phù hợp nhất dựa trên loại tác vụ
- Triển khai chiến lược dự phòng khi nhà cung cấp không khả dụng
- Tối ưu hóa chi phí bằng cách chọn mô hình phù hợp

## Cài đặt

```bash
npm install vinhnt-sdk
```

## Thiết lập cơ bản với nhiều nhà cung cấp

```typescript
import { LLMRouter, ModelProvider, TaskType } from "vinhnt-sdk";

const router = new LLMRouter();

router.register({
  name: "deepseek",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat", "deepseek-coder"],
  apiKey: process.env.DEEPSEEK_API_KEY,
  priority: 1,
  costPer1kTokens: 0.00014,
});

router.register({
  name: "openai",
  provider: ModelProvider.OPENAI,
  models: ["gpt-4o", "gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY,
  priority: 2,
  costPer1kTokens: 0.005,
});

router.register({
  name: "ollama",
  provider: ModelProvider.OLLAMA,
  models: ["llama3.1", "codellama"],
  baseUrl: "http://localhost:11434",
  priority: 3,
  costPer1kTokens: 0,
});

const llm = router.build();
```

## Định tuyến dựa trên tác vụ

```typescript
const taskRouter = new LLMRouter();

taskRouter.route(TaskType.CODE_GENERATION, {
  preferred: ["deepseek-coder", "codellama"],
  fallback: ["gpt-4o"],
});

taskRouter.route(TaskType.REASONING, {
  preferred: ["deepseek-chat", "gpt-4o"],
  fallback: ["llama3.1"],
});

taskRouter.route(TaskType.GENERAL, {
  preferred: ["gpt-4o-mini", "deepseek-chat"],
  fallback: ["llama3.1"],
});

const llm = taskRouter.build();

const codeResult = await llm.generate({
  task: TaskType.CODE_GENERATION,
  prompt: "Viết hàm tìm kiếm nhị phân bằng TypeScript",
});
```

## Chiến lược dự phòng

```typescript
const resilientRouter = new LLMRouter({
  fallbackStrategy: "sequential",
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
});

resilientRouter.register({
  name: "primary",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY,
});

resilientRouter.register({
  name: "secondary",
  provider: ModelProvider.OPENAI,
  models: ["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY,
});

resilientRouter.register({
  name: "tertiary",
  provider: ModelProvider.OLLAMA,
  models: ["llama3.1"],
  baseUrl: "http://localhost:11434",
});

const llm = resilientRouter.build();

const result = await llm.generate({
  prompt: "Tóm tắt tài liệu này",
});
```

## Tối ưu hóa chi phí

```typescript
const costRouter = new LLMRouter({
  costOptimization: true,
  maxCostPerRequest: 0.01,
  budget: { daily: 5.0, monthly: 100.0 },
});

costRouter.register({
  name: "budget",
  provider: ModelProvider.OLLAMA,
  models: ["llama3.1"],
  costPer1kTokens: 0,
});

costRouter.register({
  name: "mid-range",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  costPer1kTokens: 0.00014,
});

costRouter.register({
  name: "premium",
  provider: ModelProvider.OPENAI,
  models: ["gpt-4o"],
  costPer1kTokens: 0.005,
});

const llm = costRouter.build();

const result = await llm.generate({
  prompt: "Thủ đô của Pháp là gì?",
  requirements: { maxTokens: 100, quality: "standard" },
});
```

## Cân bằng tải

```typescript
const loadBalancer = new LLMRouter({
  loadBalancing: true,
  strategy: "round-robin",
});

loadBalancer.register({
  name: "deepseek-1",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY_1,
});

loadBalancer.register({
  name: "deepseek-2",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY_2,
});

const llm = loadBalancer.build();

for (let i = 0; i < 10; i++) {
  await llm.generate({ prompt: `Yêu cầu ${i}` });
}
```

## Theo dõi sức khỏe

```typescript
const monitoredRouter = new LLMRouter({
  healthCheck: true,
  healthCheckInterval: 60000,
  onProviderDown: (provider) => {
    console.warn(`Nhà cung cấp ${provider.name} đang gặp sự cố`);
  },
  onProviderUp: (provider) => {
    console.log(`Nhà cung cấp ${provider.name} đã hoạt động trở lại`);
  },
});

monitoredRouter.register({
  name: "deepseek",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const llm = monitoredRouter.build();
```

## Xử lý lỗi

```typescript
const safeRouter = new LLMRouter({
  fallbackStrategy: "sequential",
  maxRetries: 3,
});

safeRouter.register({
  name: "primary",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY,
});

safeRouter.register({
  name: "fallback",
  provider: ModelProvider.OPENAI,
  models: ["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY,
});

const llm = safeRouter.build();

try {
  const result = await llm.generate({ prompt: "Giải thích điện toán lượng tử" });
  console.log(result.text);
} catch (error) {
  if (error.code === "ALL_PROVIDERS_FAILED") {
    console.error("Tất cả nhà cung cấp đều không khả dụng");
  } else if (error.code === "RATE_LIMITED") {
    console.error("Bị giới hạn tốc độ bởi tất cả nhà cung cấp");
  } else if (error.code === "TIMEOUT") {
    console.error("Tất cả nhà cung cấp đều hết thời gian chờ");
  }
}
```

## Streaming với dự phòng

```typescript
const streamingRouter = new LLMRouter({
  fallbackStrategy: "sequential",
});

streamingRouter.register({
  name: "primary",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY,
});

streamingRouter.register({
  name: "fallback",
  provider: ModelProvider.OPENAI,
  models: ["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY,
});

const llm = streamingRouter.build();

const stream = await llm.stream({
  prompt: "Viết một câu chuyện về robot",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

## Biến môi trường

```env
DEEPSEEK_API_KEY=your-deepseek-api-key
OPENAI_API_KEY=your-openai-api-key
```

## Tóm tắt

Định tuyến multi-model cung cấp:

- **Linh hoạt**: Sử dụng mô hình tốt nhất cho mỗi tác vụ
- **Độ tin cậy**: Dự phòng tự động khi nhà cung cấp gặp sự cố
- **Tối ưu hóa chi phí**: Chọn mô hình rẻ nhất đáp ứng yêu cầu
- **Cân bằng tải**: Phân phối yêu cầu giữa các nhà cung cấp
- **Theo dõi sức khỏe**: Theo dõi tình trạng khả dụng của nhà cung cấp
