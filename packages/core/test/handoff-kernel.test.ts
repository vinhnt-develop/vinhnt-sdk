import { describe, expect, it } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { createHandoffTool } from "../src/kernel/handoff.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeAgentRegistry } from "../src/fakes/fake-agent-registry.js";
import type { AgentConfig, AgentId, RequestId, TraceId } from "@vinhnt-sdk/core";
import type { ModelRequest, ModelResponse } from "../src/model.js";
import type { RunEvent } from "@vinhnt-sdk/schema";

const testCtx = {
  requestId: "req_kernel_handoff" as RequestId,
  traceId: "trace_kernel_handoff" as TraceId,
  actorId: "test",
  tenantId: "default",
} as const;

const TARGET_AGENT: AgentConfig = {
  id: "code-reviewer" as AgentId,
  profile: { name: "Code Reviewer", description: "Reviews code" },
  capabilities: {},
  systemPrompt: "You are a code reviewer.",
};

const TRIAGE_AGENT: AgentConfig = {
  id: "triage" as AgentId,
  profile: { name: "Triage", description: "Routes requests" },
  capabilities: {},
  systemPrompt: "You are triage.",
};

const SPECIALIST_AGENT: AgentConfig = {
  id: "specialist" as AgentId,
  profile: { name: "Specialist", description: "Handles specialist work" },
  capabilities: {},
  systemPrompt: "You are a specialist.",
};

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => { resolve = res; });
  return { promise, resolve };
}

/** First call hands off; the continuation call blocks until the test releases the gate. */
class GatedHandoffModel extends FakeModelProvider {
  readonly continuationReached = deferred();
  readonly gate = deferred();
  private calls = 0;

  constructor() {
    super([]);
  }

  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    this.calls++;
    if (this.calls === 1) {
      return {
        provider: "fake",
        content: "",
        finishReason: "tool-calls",
        toolCalls: [
          { id: "h1", name: "transfer_to_specialist", args: { reason: "specialist needed" } },
        ],
      };
    }
    this.continuationReached.resolve();
    await new Promise<void>((resolve, reject) => {
      void this.gate.promise.then(resolve);
      signal?.addEventListener(
        "abort",
        () => reject(new DOMException("The operation was aborted.", "AbortError")),
        { once: true },
      );
    });
    return { provider: "fake", content: "after handoff" };
  }
}

function toolCallResponse(name: string, args: Record<string, unknown> = { reason: "delegating" }): ModelResponse {
  return {
    provider: "fake",
    content: "",
    finishReason: "tool-calls",
    toolCalls: [{ id: `call-${name}`, name, args }],
  };
}

describe("P2.2 kernel agent swap (handoff E2E)", () => {
  it("TC01_swaps_agent_and_completes_run_exactly_once", async () => {
    const model = new FakeModelProvider([
      {
        provider: "fake",
        content: "",
        finishReason: "tool-calls",
        toolCalls: [
          {
            id: "h1",
            name: "transfer_to_code-reviewer",
            args: { reason: "needs specialist review", summary: "User asked for a code review" },
          },
        ],
      },
      { provider: "fake", content: "Review complete: all good." },
    ]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    await registry.register(TARGET_AGENT);
    const handoffTool = createHandoffTool({
      agentId: "code-reviewer" as AgentId,
      toolDescription: "Transfer to the code reviewer",
    });
    const kernel = new AgentKernel({
      model,
      store,
      tools: [handoffTool],
      maxSteps: 10,
      agentRegistry: registry,
      permissions: { autoApprovalEnabled: true },
    });

    const handle = kernel.run("Please review my code", testCtx);
    await handle.completed;

    const events: readonly RunEvent[] = await store.list(handle.runId);
    const types = events.map((e) => e.type);

    // The handoff is announced exactly once with the target agent id.
    const handoffs = events.filter((e) => e.type === "agent.handoff");
    expect(handoffs).toHaveLength(1);
    const handoffData = handoffs[0]!.data as Record<string, unknown>;
    expect(handoffData.toAgentId).toBe("code-reviewer");
    expect(handoffData.reason).toBe("needs specialist review");

    // The run completes exactly once — with the TARGET agent's final answer.
    const completed = events.filter((e) => e.type === "run.completed");
    expect(completed).toHaveLength(1);
    const completedData = completed[0]!.data as { status: string; output: string };
    expect(completedData.status).toBe("succeeded");
    expect(completedData.output).toBe("Review complete: all good.");

    // Exactly one run.started — one logical run for the consumer.
    expect(types.filter((t) => t === "run.started")).toHaveLength(1);

    // run.completed must be the LAST event — consumers treat it as terminal.
    expect(types[types.length - 1]).toBe("run.completed");
  });

  it("TC02_rejects_cycle_handoff_and_fails_the_run", async () => {
    const model = new FakeModelProvider([
      toolCallResponse("transfer_to_specialist"),
      toolCallResponse("transfer_to_triage"),
      toolCallResponse("transfer_to_specialist"),
    ]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    await registry.register(TRIAGE_AGENT);
    await registry.register(SPECIALIST_AGENT);
    const toSpecialist = createHandoffTool({ agentId: "specialist" as AgentId, toolDescription: "Hand to specialist" });
    const toTriage = createHandoffTool({ agentId: "triage" as AgentId, toolDescription: "Hand back to triage" });
    const kernel = new AgentKernel({
      model,
      store,
      tools: [toSpecialist, toTriage],
      maxSteps: 10,
      agentRegistry: registry,
      permissions: { autoApprovalEnabled: true },
    });

    const handle = kernel.createRunHandle("do the work", testCtx, undefined, undefined, TRIAGE_AGENT);
    const result = await handle.completed;

    // triage -> specialist -> triage -> specialist(2nd) must be rejected as a cycle.
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/Handoff rejected/);
    expect(result.error).toMatch(/cycle/i);

    const events: readonly RunEvent[] = await store.list(handle.runId);
    // Only the two ALLOWED swaps are announced.
    const handoffs = events.filter((e) => e.type === "agent.handoff");
    expect(handoffs).toHaveLength(2);
    expect(handoffs.map((e) => (e.data as Record<string, unknown>).toAgentId)).toEqual(["specialist", "triage"]);
    const completed = events.filter((e) => e.type === "run.completed");
    expect(completed).toHaveLength(1);
    expect((completed[0]!.data as { status: string }).status).toBe("failed");
  });

  it("TC03_rejects_self_handoff_without_announcing_it", async () => {
    const model = new FakeModelProvider([toolCallResponse("transfer_to_triage")]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    await registry.register(TRIAGE_AGENT);
    const toTriage = createHandoffTool({ agentId: "triage" as AgentId, toolDescription: "Hand to triage" });
    const kernel = new AgentKernel({
      model,
      store,
      tools: [toTriage],
      maxSteps: 10,
      agentRegistry: registry,
      permissions: { autoApprovalEnabled: true },
    });

    const handle = kernel.createRunHandle("route this", testCtx, undefined, undefined, TRIAGE_AGENT);
    const result = await handle.completed;

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/itself/);

    const events: readonly RunEvent[] = await store.list(handle.runId);
    expect(events.filter((e) => e.type === "agent.handoff")).toHaveLength(0);
    const completed = events.filter((e) => e.type === "run.completed");
    expect(completed).toHaveLength(1);
    expect((completed[0]!.data as { status: string }).status).toBe("failed");
  });

  it("TC04_missing_target_agent_fails_the_run_with_a_terminal_event", async () => {
    const model = new FakeModelProvider([toolCallResponse("transfer_to_ghost-agent")]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry(); // empty — "ghost-agent" is not registered
    const toGhost = createHandoffTool({ agentId: "ghost-agent" as AgentId, toolDescription: "Hand to ghost" });
    const kernel = new AgentKernel({
      model,
      store,
      tools: [toGhost],
      maxSteps: 10,
      agentRegistry: registry,
      permissions: { autoApprovalEnabled: true },
    });

    const handle = kernel.createRunHandle("please delegate", testCtx);
    const result = await handle.completed;

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/not found/);

    const events: readonly RunEvent[] = await store.list(handle.runId);
    // The run must still produce exactly one terminal run.completed(failed) —
    // the handoff return path suppressed the loop's own terminal emission.
    const completed = events.filter((e) => e.type === "run.completed");
    expect(completed).toHaveLength(1);
    expect((completed[0]!.data as { status: string }).status).toBe("failed");
    expect(events.filter((e) => e.type === "agent.handoff")).toHaveLength(0);
  });

  it("TC05_run_stays_cancellable_during_the_handoff_continuation", async () => {
    const model = new GatedHandoffModel();
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    await registry.register(SPECIALIST_AGENT);
    const toSpecialist = createHandoffTool({ agentId: "specialist" as AgentId, toolDescription: "Hand to specialist" });
    const kernel = new AgentKernel({
      model,
      store,
      tools: [toSpecialist],
      maxSteps: 10,
      agentRegistry: registry,
      permissions: { autoApprovalEnabled: true },
    });

    const handle = kernel.createRunHandle("start", testCtx, "sess-cancel");
    // Wait until the continuation's model call is in flight.
    await model.continuationReached.promise;

    // The run must still be registered with the state machine (no cleanup at
    // the handoff boundary), so cancelCurrentRun aborts the continuation.
    kernel.cancelCurrentRun();
    model.gate.resolve();

    const result = await handle.completed;
    expect(result.status).toBe("cancelled");
  });

  it("TC06_event_sequence_is_one_logical_run_across_the_swap", async () => {
    const model = new FakeModelProvider([
      toolCallResponse("transfer_to_code-reviewer", { reason: "needs specialist review", summary: "User asked for a code review" }),
      { provider: "fake", content: "Review complete: all good." },
    ]);
    const store = new FakeRunEventStore();
    const registry = new FakeAgentRegistry();
    await registry.register(TARGET_AGENT);
    const handoffTool = createHandoffTool({
      agentId: "code-reviewer" as AgentId,
      toolDescription: "Transfer to the code reviewer",
    });
    const kernel = new AgentKernel({
      model,
      store,
      tools: [handoffTool],
      maxSteps: 10,
      agentRegistry: registry,
      permissions: { autoApprovalEnabled: true },
    });

    const handle = kernel.run("Please review my code", testCtx);
    await handle.completed;

    const events: readonly RunEvent[] = await store.list(handle.runId);
    expect(events.map((e) => e.type)).toEqual([
      "run.started",
      "turn.started", "step.started", "llm.request", "token.counted", "model.cost", "llm.response",
      "step.type_changed", "tool.invoked", "tool.completed", "step.completed",
      "agent.handoff",
      "turn.started", "step.started", "llm.request", "token.counted", "model.cost", "llm.response",
      "step.completed",
      "turn.end",
      "run.completed",
    ]);
  });
});
