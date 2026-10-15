import { describe, expect, it } from "vitest";
import type { RequestContext, RequestId, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { ModelProvider, ModelResponse } from "../src/model.js";
import { runLoop } from "../src/kernel/run-loop.js";
import type { RunLoopDeps, RunLoopInput } from "../src/kernel/run-loop.js";
import {
  CircuitBreaker,
  PermissionGate,
  RunStateMachine,
} from "@vinhnt-sdk/step-executor";
import { ToolSaga } from "@vinhnt-sdk/tools";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";

const testCtx: RequestContext = {
  requestId: "req_failover_retryable" as RequestId,
  traceId: "trace_failover_retryable" as TraceId,
  actorId: "test",
  tenantId: "default",
};

const primary: ModelProvider = {
  id: "primary",
  provider: "openai",
  model: "gpt-4o",
} as ModelProvider;

const alt: ModelProvider = {
  id: "alt",
  provider: "anthropic",
  model: "claude-sonnet-4",
} as ModelProvider;

function makeRegistry(models: ModelProvider[]): RunLoopDeps["modelRegistry"] {
  return {
    get: (id: string) => models.find((m) => m.model === id || m.id === id),
    getByProvider: (p: string) => models.filter((m) => m.provider === p),
    list: () => models,
  } as unknown as RunLoopDeps["modelRegistry"];
}

/** modelCaller stub that routes callModelStream by the active (possibly failed-over) model. */
function makeCaller(
  primaryImpl: () => Promise<ModelResponse>,
  altImpl: () => Promise<ModelResponse>,
) {
  let active = primary;
  const stub = {
    calls: 0,
    getActiveModel: () => active,
    setModelForRun: (_rid: RunId, m: ModelProvider) => {
      active = m;
    },
    callModelStream: async (): Promise<ModelResponse> => {
      stub.calls++;
      return active === primary ? primaryImpl() : altImpl();
    },
    calculateCost: () => 0,
    doThinkingStep: async () => {},
  };
  return stub;
}

function makeDeps(callerStub: ReturnType<typeof makeCaller>): RunLoopDeps {
  const store = new FakeRunEventStore();
  const stateMachine = new RunStateMachine();
  const approvalStore = new FakeApprovalStore();
  const permissionGate = new PermissionGate({
    store,
    pluginManager: undefined,
    approvalStore,
    autoApprovalEnabled: true,
  });
  return {
    modelCaller: callerStub,
    permissionGate,
    stepExecutor: {
      executeToolCalls: async () => ({
        toolCallCount: 0,
        recentCalls: [],
        selfCorrectTokens: { input: 0, output: 0 },
        toolResults: [],
      }),
    },
    saga: new ToolSaga(),
    store,
    // maxRetries 0: one attempt per breaker.call — failover decision must not
    // depend on breaker-internal retries.
    circuitBreaker: new CircuitBreaker({ maxRetries: 0 }),
    stateMachine,
    addSessionMessage: async () => {},
    maxSteps: 5,
    maxTokens: 4096,
    thinkingBudget: 0,
    stepTimeout: 60_000,
    failoverModels: ["claude-sonnet-4"],
    modelRegistry: makeRegistry([primary, alt]),
  } as unknown as RunLoopDeps;
}

interface CapturedEvent {
  type: string;
  data: Record<string, unknown>;
}

function makeInput(events: CapturedEvent[]): RunLoopInput {
  return {
    prompt: "hello",
    runId: "run_fo_retryable" as RunId,
    ctx: testCtx,
    runAbort: new AbortController(),
    runModel: primary,
    addSessionMessage: async () => {},
    emitEvent: async (e) => {
      events.push({ type: e.type, data: e.data });
    },
    setState: () => {},
    emitCompleted: async () => {},
    emitFail: async () => {},
  };
}

const failoverEvents = (events: CapturedEvent[]) =>
  events.filter((e) => e.type === "llm.failover");

describe("P0.3 failover is gated on error retryable", () => {
  it("does NOT failover on a non-retryable auth error (401)", async () => {
    const authErr = Object.assign(new Error("401 Incorrect API key provided"), {
      code: "ERR_UPSTREAM_401",
      retryable: false,
      status: 401,
    });
    const caller = makeCaller(async () => {
      throw authErr;
    }, async () => {
      throw new Error("alt must not be called");
    });
    const events: CapturedEvent[] = [];

    const result = await runLoop(makeDeps(caller), makeInput(events));

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Incorrect API key");
    expect(failoverEvents(events)).toHaveLength(0);
    expect(caller.calls).toBe(1);
    expect(caller.getActiveModel()).toBe(primary);
  });

  it("does NOT failover on a billing quota error (ERR_BILLING_REQUIRED)", async () => {
    const billingErr = Object.assign(
      new Error("You exceeded your current quota, please check your plan and billing details."),
      { code: "ERR_BILLING_REQUIRED", retryable: false, status: 429 },
    );
    const caller = makeCaller(async () => {
      throw billingErr;
    }, async () => {
      throw new Error("alt must not be called");
    });
    const events: CapturedEvent[] = [];

    const result = await runLoop(makeDeps(caller), makeInput(events));

    expect(result.status).toBe("failed");
    expect(failoverEvents(events)).toHaveLength(0);
    expect(caller.calls).toBe(1);
  });

  it("failovers on a transient error and emits llm.failover", async () => {
    const busyErr = Object.assign(new Error("503 service busy"), {
      code: "ERR_UPSTREAM_503",
      retryable: true,
      status: 503,
    });
    const caller = makeCaller(
      async () => {
        throw busyErr;
      },
      async () => ({
        content: "ok from alt",
        provider: "anthropic",
        model: "claude-sonnet-4",
        finishReason: "stop",
      } as ModelResponse),
    );
    const events: CapturedEvent[] = [];

    const result = await runLoop(makeDeps(caller), makeInput(events));

    expect(result.status).toBe("succeeded");
    expect(result.output).toBe("ok from alt");
    const failovers = failoverEvents(events);
    expect(failovers).toHaveLength(1);
    expect(failovers[0]?.data).toMatchObject({
      fromProvider: "openai",
      fromModel: "gpt-4o",
      toProvider: "anthropic",
      toModel: "claude-sonnet-4",
    });
    expect(caller.calls).toBe(2);
    expect(caller.getActiveModel()).toBe(alt);
  });
});
