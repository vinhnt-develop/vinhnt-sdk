---
title: "@vinhnt-sdk/workflow"
description: "Workflow primitives for agent orchestration"
lang: en
type: "reference"
category: "API Reference"
sidebarLabel: workflow
version: "0.4.0"
---

# @vinhnt-sdk/workflow

Workflow primitives for agent orchestration — parallel, sequential, conditional execution.

Inspired by Google ADK workflow patterns.

## Install

```bash
npm install @vinhnt-sdk/workflow
```

## Exports

### `parallel(steps)`

Execute multiple steps concurrently. Returns results for all steps.

```ts
import { parallel } from "@vinhnt-sdk/workflow";

const results = await parallel([
  { name: "fetch-user", execute: async () => getUser() },
  { name: "fetch-posts", execute: async () => getPosts() },
  { name: "fetch-comments", execute: async () => getComments() },
]);

// results[0].output → user data
// results[1].output → posts data
// results[2].output → comments data
```

### `sequential(steps, initialInput)`

Execute steps sequentially, passing output of one as input to the next.

```ts
import { sequential } from "@vinhnt-sdk/workflow";

const result = await sequential([
  { name: "validate", execute: async (input) => validate(input) },
  { name: "transform", execute: async (input) => transform(input) },
  { name: "save", execute: async (input) => save(input) },
], rawData);

// result.output → final saved result
```

### `conditional(input, branches)`

Execute steps conditionally based on input. First matching branch runs.

```ts
import { conditional } from "@vinhnt-sdk/workflow";

const result = await conditional(userInput, [
  {
    condition: (input) => input.role === "admin",
    steps: [adminProcess],
    name: "admin-path",
  },
  {
    condition: (input) => input.role === "user",
    steps: [userProcess],
    name: "user-path",
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

### `WorkflowContext`

```ts
interface WorkflowContext {
  readonly workflowId: string;
  readonly stepIndex: number;
  readonly metadata: Record<string, unknown>;
  readonly signal?: AbortSignal | undefined;
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

### `ConditionalBranch<TInput, TOutput>`

```ts
interface ConditionalBranch<TInput = unknown, TOutput = unknown> {
  readonly condition: (input: TInput) => boolean | Promise<boolean>;
  readonly steps: WorkflowStep[];
  readonly name?: string;
}
```

## Dependencies

- `@vinhnt-sdk/schema`
