import { describe, expect, it } from "vitest";
import type { AgentId } from "@vinhnt-sdk/schema";
import {
  AgentGraph,
  createSequentialWorkflow,
  createParallelWorkflow,
} from "../src/index.js";
import type {
  GraphExecutor,
  GraphContext,
  WorkflowNodeType,
  WorkflowNode,
  AgentNode,
  ConditionNode,
  TransformNode,
  ParallelNode,
  SequentialNode,
  AnyWorkflowNode,
  WorkflowEdge,
  Workflow,
  WorkflowNodeStatus,
  WorkflowNodeResult,
  WorkflowResult,
  WorkflowCondition,
} from "../src/index.js";

const agentId = (s: string) => s as AgentId;

interface Call {
  agent: string;
  prompt: string;
  actorId: string;
  tenantId: string;
}

function recordingExecutor(
  outputs: Record<string, string> = {},
  opts: { onCall?: (call: Call) => void } = {},
): GraphExecutor {
  return {
    async runAgent(id, prompt, ctx) {
      const call: Call = { agent: id, prompt, actorId: ctx.actorId ?? "MISSING", tenantId: ctx.tenantId ?? "MISSING" };
      opts.onCall?.(call);
      if (outputs[id] === undefined) throw new Error(`boom:${id}`);
      return outputs[id];
    },
  };
}

function ctxOf(executor: GraphExecutor, extra: Partial<GraphContext> = {}): GraphContext {
  return { executor, requestId: "req_1", traceId: "tr_1", ...extra };
}

describe("AgentGraph (G6.3)", () => {
  it("runs a sequential chain over edges, threading prev.output, finalOutput = last output", async () => {
    const calls: Call[] = [];
    const graph = createSequentialWorkflow("wf_seq", "Flow", [
      { agentId: agentId("a0"), inputTemplate: "{{input}}" },
      { agentId: agentId("a1"), inputTemplate: "prev={{prev.output}}" },
      { agentId: agentId("a2"), inputTemplate: "{{prev.output}}-tail" },
    ]);
    const result: WorkflowResult = await graph.execute(
      ctxOf(recordingExecutor({ a0: "OUT0", a1: "OUT1", a2: "OUT2" }, { onCall: (c) => calls.push(c) }), { input: "SEED" }),
    );

    expect(result.status).toBe("completed");
    expect(result.finalOutput).toBe("OUT2");
    expect(calls.map((c) => c.agent)).toEqual(["a0", "a1", "a2"]);
    expect(calls[0]!.prompt).toBe("SEED");
    expect(calls[1]!.prompt).toBe("prev=OUT0");
    expect(calls[2]!.prompt).toBe("OUT1-tail");
    const statuses: WorkflowNodeStatus[] = result.nodeResults.map((n: WorkflowNodeResult) => n.status);
    expect(statuses.every((s) => s === "completed")).toBe(true);
    const wf: Workflow = graph.build();
    expect(wf.nodes.map((n) => n.id)).toEqual(["step-0", "step-1", "step-2"]);
  });

  it("fans out parallel branches concurrently and joins outputs", async () => {
    const calls: Call[] = [];
    const graph = createParallelWorkflow("wf_par", "Fan", [
      { agentId: agentId("p0"), inputTemplate: "in={{input}}" },
      { agentId: agentId("p1"), inputTemplate: "T({{input}})" },
    ]);
    const result = await graph.execute(
      ctxOf(recordingExecutor({ p0: "P0", p1: "P1" }, { onCall: (c) => calls.push(c) }), { input: "X" }),
    );

    expect(result.status).toBe("completed");
    expect(result.finalOutput).toBe("P0\n---\nP1");
    expect(calls.map((c) => c.prompt).sort()).toEqual(["T(X)", "in=X"]);
  });

  it("condition: predicate true takes trueEdge, false takes falseEdge", async () => {
    const calls: Call[] = [];
    const graph = new AgentGraph("wf_cond", "Branch", "d");
    const cond: ConditionNode = {
      id: "c",
      type: "condition",
      condition: ((vars) => vars["input"] === "yes") satisfies WorkflowCondition,
      trueEdge: "yesNode",
      falseEdge: "noNode",
    };
    graph
      .addNode(cond)
      .addNode({ id: "yesNode", type: "agent", agentId: agentId("YES"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .addNode({ id: "noNode", type: "agent", agentId: agentId("NO"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .setEntry("c");

    const rYes = await graph.execute(
      ctxOf(recordingExecutor({ YES: "Y", NO: "N" }, { onCall: (c) => calls.push(c) }), { input: "yes" }),
    );
    const rNo = await graph.execute(
      ctxOf(recordingExecutor({ YES: "Y", NO: "N" }, { onCall: (c) => calls.push(c) }), { input: "no" }),
    );

    expect(rYes.status).toBe("completed");
    expect(rYes.finalOutput).toBe("Y");
    expect(rNo.status).toBe("completed");
    expect(rNo.finalOutput).toBe("N");
    expect(calls.map((c) => c.agent)).toEqual(["YES", "NO"]);
    expect(rYes.nodeResults.find((n) => n.nodeId === "c")?.status).toBe("completed");
  });

  it("condition: labeled true/false edges override inline trueEdge/falseEdge", async () => {
    const calls: Call[] = [];
    const graph = new AgentGraph("wf_label", "Labeled");
    graph
      .addNode({
        id: "c",
        type: "condition",
        condition: () => true,
        trueEdge: "inlineNo",
        falseEdge: "inlineNo",
      } satisfies ConditionNode)
      .addNode({ id: "edgeYes", type: "agent", agentId: agentId("EDGE_YES"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .addNode({ id: "inlineNo", type: "agent", agentId: agentId("INLINE_NO"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .addEdge("c", "edgeYes", "true")
      .addEdge("c", "inlineNo", "false")
      .setEntry("c");

    const result = await graph.execute(
      ctxOf(recordingExecutor({ EDGE_YES: "E", INLINE_NO: "I" }, { onCall: (c) => calls.push(c) }), { input: "v" }),
    );

    expect(result.status).toBe("completed");
    expect(result.finalOutput).toBe("E");
    expect(calls.map((c) => c.agent)).toEqual(["EDGE_YES"]);
  });

  it("diamond join runs exactly once (run-once memo)", async () => {
    let jRuns = 0;
    const executor: GraphExecutor = {
      async runAgent(id) {
        if (id === "j") jRuns += 1;
        return `out-${id}`;
      },
    };
    const graph = new AgentGraph("wf_diamond", "Diamond");
    graph
      .addNode({ id: "p", type: "parallel", branches: ["a", "b"] } satisfies ParallelNode)
      .addNode({ id: "a", type: "agent", agentId: agentId("a"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .addNode({ id: "b", type: "agent", agentId: agentId("b"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .addNode({ id: "j", type: "agent", agentId: agentId("j"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .addEdge("a", "j")
      .addEdge("b", "j")
      .setEntry("p");

    const result = await graph.execute(ctxOf(executor));

    expect(result.status).toBe("completed");
    expect(jRuns).toBe(1);
    expect(result.finalOutput).toBe("out-j\n---\nout-j");
    expect(result.nodeResults.filter((n) => n.nodeId === "j")).toHaveLength(1);
  });

  it("detects cycles instead of recursing forever", async () => {
    const graph = new AgentGraph("wf_cycle", "Cycle");
    graph
      .addNode({ id: "a", type: "agent", agentId: agentId("a"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .addNode({ id: "b", type: "agent", agentId: agentId("b"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .addEdge("a", "b")
      .addEdge("b", "a")
      .setEntry("a");

    const result = await graph.execute(ctxOf(recordingExecutor({ a: "A", b: "B" })));

    expect(result.status).toBe("failed");
    expect(result.error).toContain('Cycle detected at node "a"');
    const failed = result.nodeResults.filter((n) => n.status === "failed").map((n) => n.nodeId);
    expect(failed).toEqual(["b", "a"]);
  });

  it("validates build: missing entry, unknown edge target, unknown condition target", async () => {
    const noEntry = new AgentGraph("wf_e1", "NoEntry");
    noEntry.addNode({ id: "a", type: "agent", agentId: agentId("a"), inputTemplate: "{{input}}" } satisfies AgentNode);
    expect((await noEntry.execute(ctxOf(recordingExecutor({})))).error).toBe("Entry node not set");

    const badEdge = new AgentGraph("wf_e2", "BadEdge");
    badEdge.addNode({ id: "a", type: "agent", agentId: agentId("a"), inputTemplate: "{{input}}" } satisfies AgentNode);
    badEdge.addEdge("a", "ghost").setEntry("a");
    expect((await badEdge.execute(ctxOf(recordingExecutor({})))).error).toContain("Edge references unknown node: ghost");

    const badCond = new AgentGraph("wf_e3", "BadCond");
    badCond
      .addNode({ id: "c", type: "condition", condition: () => true, trueEdge: "ghostT", falseEdge: "ghostF" } satisfies ConditionNode)
      .setEntry("c");
    const res = await badCond.execute(ctxOf(recordingExecutor({})));
    expect(res.status).toBe("failed");
    expect(res.error).toContain("trueEdge not found");
  });

  it("honors a pre-aborted signal without running any node", async () => {
    let calls = 0;
    const executor: GraphExecutor = {
      async runAgent() {
        calls += 1;
        return "x";
      },
    };
    const graph = new AgentGraph("wf_sig1", "Sig");
    graph.addNode({ id: "a", type: "agent", agentId: agentId("a"), inputTemplate: "{{input}}" } satisfies AgentNode).setEntry("a");

    const result = await graph.execute(ctxOf(executor, { signal: AbortSignal.abort() }));
    expect(result.status).toBe("failed");
    expect(result.error).toBe("Workflow aborted");
    expect(calls).toBe(0);
    expect(result.nodeResults.map((n) => `${n.nodeId}:${n.status}:${n.error}`)).toEqual(["a:failed:Workflow aborted"]);
  });

  it("checks the signal between nodes and does not start successors", async () => {
    const controller = new AbortController();
    let calls = 0;
    const executor: GraphExecutor = {
      async runAgent() {
        calls += 1;
        controller.abort();
        return "a-out";
      },
    };
    const graph = new AgentGraph("wf_sig2", "SigMid");
    graph
      .addNode({ id: "a", type: "agent", agentId: agentId("a"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .addNode({ id: "b", type: "agent", agentId: agentId("b"), inputTemplate: "{{prev.output}}" } satisfies AgentNode)
      .addEdge("a", "b")
      .setEntry("a");

    const result = await graph.execute(ctxOf(executor, { signal: controller.signal }));
    expect(result.status).toBe("failed");
    expect(result.error).toBe("Workflow aborted");
    expect(calls).toBe(1);
    expect(result.nodeResults.find((n) => n.nodeId === "b")?.status).toBe("failed");
  });

  it("propagates agent failures with node-level results", async () => {
    const graph = new AgentGraph("wf_fail", "Fail");
    graph
      .addNode({ id: "ok", type: "agent", agentId: agentId("ok"), inputTemplate: "{{input}}" } satisfies AgentNode)
      .addNode({ id: "bad", type: "agent", agentId: agentId("bad"), inputTemplate: "{{prev.output}}" } satisfies AgentNode)
      .addEdge("ok", "bad")
      .setEntry("ok");

    const result = await graph.execute(ctxOf(recordingExecutor({ ok: "fine" })));

    expect(result.status).toBe("failed");
    expect(result.error).toBe("boom:bad");
    expect(result.nodeResults.map((n) => `${n.nodeId}:${n.status}`)).toEqual(["bad:failed", "ok:failed"]);
  });

  it("runs transform nodes and exposes node-id outputs to successors", async () => {
    const calls: Call[] = [];
    const graph = new AgentGraph("wf_tf", "Transform");
    const t: TransformNode = { id: "t", type: "transform", transform: "[{{input}}]" };
    graph
      .addNode(t)
      .addNode({ id: "gen", type: "agent", agentId: agentId("gen"), inputTemplate: "seed" } satisfies AgentNode)
      .addNode({ id: "use", type: "agent", agentId: agentId("use"), inputTemplate: "{{gen}}+{{t}}" } satisfies AgentNode)
      .addEdge("t", "gen")
      .addEdge("gen", "use")
      .setEntry("t");

    const result = await graph.execute(
      ctxOf(recordingExecutor({ gen: "GEN", use: "USE" }, { onCall: (c) => calls.push(c) }), { input: "I" }),
    );

    expect(result.status).toBe("completed");
    expect(result.finalOutput).toBe("USE");
    expect(calls.map((c) => c.prompt)).toEqual(["seed", "GEN+[I]"]);
  });

  it("defaults actorId/tenantId on the per-node RequestContext and honors overrides", async () => {
    const seen: string[] = [];
    const executor: GraphExecutor = {
      async runAgent(_id, _prompt, ctx) {
        seen.push(`${ctx.actorId}/${ctx.tenantId}`);
        return "o";
      },
    };
    const graph = new AgentGraph("wf_ctx", "Ctx");
    graph.addNode({ id: "a", type: "agent", agentId: agentId("a"), inputTemplate: "{{input}}" } satisfies AgentNode).setEntry("a");

    await graph.execute(ctxOf(executor));
    await graph.execute(ctxOf(executor, { actorId: "user_1", tenantId: "ten_1" }));

    expect(seen).toEqual(["workflow/default", "user_1/ten_1"]);
  });

  it("createSequentialWorkflow with zero steps fails on validation", async () => {
    const graph = createSequentialWorkflow("wf_empty", "Empty", []);
    const result = await graph.execute(ctxOf(recordingExecutor({})));
    expect(result.status).toBe("failed");
    expect(result.error).toBe("Entry node not set");
  });

  it("exposes the full type surface (types are live exports)", () => {
    const type: WorkflowNodeType = "transform";
    const base: WorkflowNode = { id: "n", type: "agent" };
    const agent: AgentNode = { id: "a", type: "agent", agentId: agentId("x"), inputTemplate: "{{input}}" };
    const cond: ConditionNode = { id: "c", type: "condition", condition: (v) => v["a"] === "1", trueEdge: "a", falseEdge: "a" };
    const tf: TransformNode = { id: "t", type: "transform", transform: "{{a}}" };
    const par: ParallelNode = { id: "p", type: "parallel", branches: ["a"] };
    const seq: SequentialNode = { id: "s", type: "sequential", steps: ["a"] };
    const any: AnyWorkflowNode[] = [agent, cond, tf, par, seq];
    const edge: WorkflowEdge = { from: "a", to: "b", label: "true" };

    expect(type).toBe("transform");
    expect(base.type).toBe("agent");
    expect(cond.condition({ a: "1" })).toBe(true);
    expect(par.branches).toEqual(["a"]);
    expect(seq.steps).toEqual(["a"]);
    expect(any).toHaveLength(5);
    expect(edge.label).toBe("true");
  });
});
