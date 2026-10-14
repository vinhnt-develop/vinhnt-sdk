# @vinhnt-sdk/step-executor

Step execution kernel for VNT Agent — tool lifecycle, per-tool timeouts, permission gating, doom-loop detection, self-correction and run state machine.

## Install

```bash
pnpm add @vinhnt-sdk/step-executor
```

## Usage

```ts
import { StepExecutor, PermissionGate, RunStateMachine } from "@vinhnt-sdk/step-executor";
```

## Contents

- `StepExecutor` — per-step tool execution: invoke → permission re-check → run with timeout → result processing, with pluggable hooks/logging
- `PermissionGate` — permission evaluation against saved patterns, rules and risk defaults (consumes `@vinhnt-sdk/permission`)
- `tool-context-builder` / `approval-handler` / `tool-error-router` / `self-correction` / `tool-result-processor` — step lifecycle helpers
- `termination` — stop-condition evaluation and judge-based loop termination
- `kernel-utils` — doom-loop detection, arg hashing, timeouts, tool domains, defaults
- `run-state` / `run-context` — per-run state machine and context
- `loop-policy` / `path-policy` — loop/path safety policies
- `kernel-error` — typed step errors; failure isolation via `@vinhnt-sdk/guard` circuit breaker

## Hooks

The package exposes a minimal structural `StepExecutorPluginHooks` interface. Hosts (e.g. core's `PluginManager`) only need to implement `fireHook` for the tool-lifecycle / permission hook names.