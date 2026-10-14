import { describe, expect, it } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import { getTextContent } from "../src/model.js";
import type { ModelRequest, ModelResponse } from "../src/model.js";
import { InMemorySessionState } from "@vinhnt-sdk/session";
import type { AgentConfig, AgentId, RequestId, TraceId } from "@vinhnt-sdk/core";

const testCtx = {
  requestId: "req_p55_session_state" as RequestId,
  traceId: "trace_p55_session_state" as TraceId,
  actorId: "test",
  tenantId: "default",
} as const;

const CHILD_AGENT: AgentConfig = {
  id: "child" as AgentId,
  profile: { name: "Child", description: "Sub-agent under test" },
  capabilities: {},
  systemPrompt: "You are the child agent.",
};

const PARENT_AGENT: AgentConfig = {
  id: "parent" as AgentId,
  profile: { name: "Parent", description: "Parent agent under test" },
  capabilities: {},
  systemPrompt: "You are the parent agent.",
};

const HISTORY = "hello history";
const SUBTASK = "SUBTASK";
const PARENT_WAIT = "PARENT-WAIT";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => { resolve = res; });
  return { promise, resolve };
}

function gateWait(gate: Promise<void>, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    void gate.then(resolve);
    signal?.addEventListener(
      "abort",
      () => reject(new DOMException("The operation was aborted.", "AbortError")),
      { once: true },
    );
  });
}

function requestText(request: ModelRequest): string {
  return request.messages.map((m) => getTextContent(m.content)).join("\n");
}

function messageTexts(state: InMemorySessionState): string[] {
  return state.messages.map((m) => getTextContent(m.content));
}

function kernelState(kernel: AgentKernel): InMemorySessionState {
  return (kernel as unknown as { sessionState: InMemorySessionState }).sessionState;
}

/**
 * Records every model request and gates in-flight calls so a test can assert
 * on kernel state WHILE a sub-agent run is executing (P5.5 residue fix:
 * sub-agent children must never wipe or swap the kernel session state).
 */
class SessionProbeModel extends FakeModelProvider {
  readonly requests: ModelRequest[] = [];
  readonly parentReached = deferred();
  readonly parentGate = deferred();
  readonly firstChildReached = deferred();
  readonly bothChildrenReached = deferred();
  readonly childGate = deferred();
  private childCalls = 0;

  constructor() {
    super([]);
  }

  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    this.requests.push(request);
    const text = requestText(request);
    if (text.includes(PARENT_WAIT)) {
      this.parentReached.resolve();
      await gateWait(this.parentGate.promise, signal);
      return { provider: "fake", content: "parent done" };
    }
    if (text.includes(SUBTASK)) {
      this.childCalls++;
      this.firstChildReached.resolve();
      if (this.childCalls >= 2) this.bothChildrenReached.resolve();
      await gateWait(this.childGate.promise, signal);
      return { provider: "fake", content: "child done" };
    }
    return { provider: "fake", content: "ok" };
  }
}

async function makeKernel(model: SessionProbeModel): Promise<AgentKernel> {
  const store = new FakeRunEventStore();
  const registry = new FakeAgentRegistry();
  await registry.register(CHILD_AGENT);
  const sessionState = new InMemorySessionState();
  sessionState.resetMessages([{ role: "user", content: HISTORY }]);
  return new AgentKernel({
    model,
    store,
    agentRegistry: registry,
    maxSteps: 5,
    permissions: { autoApprovalEnabled: true },
    sessionState,
  });
}

describe("P5.5 per-run sub-agent session state", () => {
  it("TC01_sub_agent_never_wipes_kernel_session_state_mid_flight", async () => {
    const model = new SessionProbeModel();
    const kernel = await makeKernel(model);
    const state = kernelState(kernel);

    const parentHandle = kernel.run(`${PARENT_WAIT} do parent work`, testCtx, "session-p");
    await model.parentReached.promise;
    expect(messageTexts(state)).toEqual([HISTORY]);

    const childPromise = kernel.runAgent(
      CHILD_AGENT.id,
      `${SUBTASK} do the sub task`,
      testCtx,
      "session-p",
      parentHandle.runId,
    );
    await model.firstChildReached.promise;

    // The child in flight must not have wiped the state the parent still reads.
    expect(messageTexts(state)).toEqual([HISTORY]);

    // The child ran on its own forked transcript, not the shared one.
    const childRequest = model.requests.find((r) => requestText(r).includes(SUBTASK));
    if (!childRequest) throw new Error("child model request not found");
    expect(requestText(childRequest)).not.toContain(HISTORY);

    model.childGate.resolve();
    await childPromise;
    expect(kernelState(kernel)).toBe(state);
    expect(messageTexts(state)).toEqual([HISTORY]);

    model.parentGate.resolve();
    await parentHandle.completed;
    const texts = messageTexts(state);
    expect(texts).toContain(HISTORY);
    expect(texts.some((t) => t.includes(PARENT_WAIT))).toBe(true);
  });

  it("TC02_concurrent_sessions_survive_a_sub_agent_run", async () => {
    const model = new SessionProbeModel();
    const kernel = await makeKernel(model);
    const state = kernelState(kernel);

    // Session A spawns a sub-agent and blocks mid-flight.
    const childPromise = kernel.runAgent(CHILD_AGENT.id, `${SUBTASK} steal the files`, testCtx, "session-a");
    await model.firstChildReached.promise;

    // While session A's sub-agent is in flight, a run on session B must still
    // see the kernel conversation state.
    const bHandle = kernel.run("B prompt", testCtx, "session-b");
    await bHandle.completed;

    const bRequest = model.requests.find((r) => requestText(r).includes("B prompt"));
    if (!bRequest) throw new Error("session-b model request not found");
    expect(requestText(bRequest)).toContain(HISTORY);

    model.childGate.resolve();
    await childPromise;

    // The sub-agent's completion must not clobber session B's persisted turn.
    expect(messageTexts(state)).toContain("B prompt");
    expect(messageTexts(state)).toContain(HISTORY);
  });

  it("TC03_parallel_sub_agents_leave_kernel_state_and_current_agent_untouched", async () => {
    const model = new SessionProbeModel();
    const kernel = await makeKernel(model);
    const state = kernelState(kernel);
    kernel.setCurrentAgent(PARENT_AGENT);

    const running = kernel.runAgentsParallel(
      [
        { agentId: CHILD_AGENT.id, prompt: `${SUBTASK} one` },
        { agentId: CHILD_AGENT.id, prompt: `${SUBTASK} two` },
      ],
      testCtx,
    );
    await model.bothChildrenReached.promise;

    // While children are in flight the kernel state object must not be swapped
    // for a child fork, and its transcript must stay intact.
    expect(kernelState(kernel)).toBe(state);
    expect(messageTexts(state)).toEqual([HISTORY]);

    model.childGate.resolve();
    await running;

    expect(kernelState(kernel)).toBe(state);
    expect(messageTexts(state)).toEqual([HISTORY]);
    // P5.5: the parallel agent swap must restore the original agent exactly.
    expect(kernel.getCurrentAgent()).toBe(PARENT_AGENT);
  });
});
