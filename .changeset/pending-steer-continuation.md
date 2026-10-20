---
"@vinhnt-sdk/core": minor
"@vinhnt-sdk/session": minor
"@vinhnt-sdk/step-executor": minor
---

Answer steering inputs admitted during a run's final step before the run settles, and stop replaying pending inputs twice.

- `RunStateMachine.hasPendingInputs()` exposes the buffered input queue.
- The run loop continues for one more step when a step completes with pending inputs (bounded by `maxSteps`), so the steer is answered by the run that admitted it.
- `AgentKernel.sendInput()` returns `false` once the run is no longer live, letting callers fall back instead of reporting a false acceptance.
- `loadSessionHistory()` excludes admitted-but-un-promoted inputs; the kernel's pending-input hydration is their single delivery path.
