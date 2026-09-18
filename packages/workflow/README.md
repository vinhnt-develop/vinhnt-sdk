# @vinhnt-sdk/workflow

> Version: 0.4.0 | Status: BETA

Workflow primitives for agent orchestration — parallel, sequential, conditional execution.

## Install

```bash
# npm
npm install @vinhnt-sdk/workflow

# pnpm (monorepo)
pnpm add @vinhnt-sdk/workflow
```

## Quick Start

```typescript
import { parallel, sequential, conditional } from '@vinhnt-sdk/workflow';

// Parallel execution
const results = await parallel([
  { name: 'fetch-user', execute: async () => getUser() },
  { name: 'fetch-posts', execute: async () => getPosts() },
]);

// Sequential execution
const result = await sequential([
  { name: 'validate', execute: async (input) => validate(input) },
  { name: 'process', execute: async (input) => process(input) },
  { name: 'save', execute: async (input) => save(input) },
], initialInput);

// Conditional execution
const result = await conditional(input, [
  {
    condition: (input) => input.type === 'admin',
    steps: [adminStep],
    name: 'admin-path',
  },
  {
    condition: () => true,
    steps: [defaultStep],
    name: 'default-path',
  },
]);
```

## Exports

### Types

| Type | Description |
|------|-------------|
| `WorkflowStep<TInput, TOutput>` | A single workflow step |
| `WorkflowContext` | Context passed to each step |
| `StepResult<T>` | Result of a workflow step |
| `ConditionalBranch<TInput, TOutput>` | A conditional branch |

### Functions

| Function | Description |
|----------|-------------|
| `parallel(steps)` | Execute multiple steps in parallel |
| `sequential(steps, input)` | Execute steps sequentially, chaining outputs |
| `conditional(input, branches)` | Execute steps conditionally based on input |

## Dependencies

- `@vinhnt-sdk/schema`
