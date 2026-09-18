---
title: "@vinhnt-sdk/workflow"
description: "Workflow primitives cho sắp xếp agent"
lang: vi
type: "reference"
category: "API Reference"
sidebarLabel: workflow
version: "0.4.0"
---

# @vinhnt-sdk/workflow

Workflow primitives cho sắp xếp agent — thực thi song song, tuần tự, có điều kiện.

Được lấy cảm hứng từ Google ADK workflow patterns.

## Cài đặt

```bash
npm install @vinhnt-sdk/workflow
```

## Xuất (Exports)

### `parallel(steps)`

Thực thi nhiều bước đồng thời. Trả kết quả cho tất cả bước.

```ts
import { parallel } from "@vinhnt-sdk/workflow";

const results = await parallel([
  { name: "lay-nguoi-dung", execute: async () => getUser() },
  { name: "lay-bai-viet", execute: async () => getPosts() },
]);
```

### `sequential(steps, initialInput)`

Thực thi các bước tuần tự, truyền output của bước này làm input cho bước tiếp.

```ts
import { sequential } from "@vinhnt-sdk/workflow";

const result = await sequential([
  { name: "xac-thuc", execute: async (input) => validate(input) },
  { name: "xu-ly", execute: async (input) => process(input) },
  { name: "luu", execute: async (input) => save(input) },
], rawData);
```

### `conditional(input, branches)`

Thực thi các bước có điều kiện dựa trên input. Nhánh đầu tiên khớp sẽ chạy.

```ts
import { conditional } from "@vinhnt-sdk/workflow";

const result = await conditional(userInput, [
  {
    condition: (input) => input.role === "admin",
    steps: [adminProcess],
    name: "admin-path",
  },
  {
    condition: () => true,
    steps: [defaultProcess],
    name: "default-path",
  },
]);
```

## Types

### `WorkflowStep<TInput, TOutput>`

```ts
interface WorkflowStep<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  execute(input: TInput, ctx: WorkflowContext): Promise<TOutput>;
}
```

### `StepResult<T>`

```ts
interface StepResult<T = unknown> {
  readonly success: boolean;
  readonly output?: T;
  readonly error?: Error | undefined;
  readonly durationMs: number;
}
```

## Dependencies

- `@vinhnt-sdk/schema`
