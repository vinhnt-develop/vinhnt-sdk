/**
 * P5.10 (S15) — workflow integration gate.
 *
 * Composes ALL three primitives (sequential → conditional → parallel) into one
 * pipeline and asserts output threading, WorkflowContext propagation and
 * failure short-circuiting ACROSS primitive boundaries — the unit tests only
 * cover each primitive in isolation.
 *
 * Context contract this file pins down (real semantics):
 * - sequential passes ONE shared metadata object to every stage ctx;
 * - conditional tags only the branch-step ctx with `branch`;
 * - a stage re-broadcasts {...branchCtx.metadata, stage} to parallel workers.
 */

import { describe, it, expect } from "vitest";
import { parallel, sequential, conditional } from "../src/index.js";
import type { WorkflowStep, ConditionalBranch, WorkflowContext } from "../src/index.js";

interface Routed {
  mode: "fanout" | "solo";
  payload: number;
}

/** Stage 1: parse the raw input into a routable shape. */
function normalize(stageCtxs: WorkflowContext[]): WorkflowStep<unknown, unknown> {
  return {
    name: "normalize",
    execute: async (input, ctx) => {
      stageCtxs.push(ctx);
      const value = Number(input);
      return { mode: value > 10 ? "fanout" : "solo", payload: value } satisfies Routed;
    },
  };
}

/** Stage 2a: fan-out branch — captures its own branch ctx, 3 workers summed by an inner `parallel`. */
function fanoutStep(
  workerCtxs: WorkflowContext[],
  branchCtxs: WorkflowContext[],
  order: string[],
): WorkflowStep<unknown, unknown> {
  return {
    name: "fanout",
    execute: async (input, ctx) => {
      branchCtxs.push(ctx);
      order.push("fanout");
      const { payload } = input as Routed;
      const workers: WorkflowStep<unknown, number>[] = [0, 1, 2].map((i) => ({
        name: `worker-${i}`,
        execute: async (_input, workerCtx) => {
          workerCtxs.push(workerCtx);
          return payload + i;
        },
      }));
      const results = await parallel<number>(workers, {
        workflowId: ctx.workflowId,
        metadata: { ...ctx.metadata, stage: "fan" },
      });
      const failed = results.find((r) => !r.success);
      if (failed) throw failed.error;
      return results.reduce((sum, r) => sum + (r.output ?? 0), 0);
    },
  };
}

/** Stage 2b: solo branch — captures its own branch ctx, single step. */
function soloStep(branchCtxs: WorkflowContext[], order: string[]): WorkflowStep<unknown, unknown> {
  return {
    name: "solo",
    execute: async (input, ctx) => {
      branchCtxs.push(ctx);
      order.push("solo");
      return (input as Routed).payload * 2;
    },
  };
}

/** Stage 3: terminal step — must never run when an inner branch failed. */
function aggregate(stageCtxs: WorkflowContext[], order: string[]): WorkflowStep<unknown, unknown> {
  return {
    name: "aggregate",
    execute: async (input, ctx) => {
      stageCtxs.push(ctx);
      order.push("aggregate");
      return { total: input };
    },
  };
}

function routeBranches(
  workerCtxs: WorkflowContext[],
  branchCtxs: WorkflowContext[],
  order: string[],
): ConditionalBranch[] {
  return [
    {
      name: "fanout",
      condition: (i) => (i as Routed).mode === "fanout",
      steps: [fanoutStep(workerCtxs, branchCtxs, order)],
    },
    { name: "solo", condition: () => true, steps: [soloStep(branchCtxs, order)] },
  ];
}

/** Wraps `conditional` as a pipeline stage, failing the stage when no branch ran. */
function routeStage(
  stageCtxs: WorkflowContext[],
  workerCtxs: WorkflowContext[],
  branchCtxs: WorkflowContext[],
  order: string[],
): WorkflowStep<unknown, unknown> {
  return {
    name: "route",
    execute: async (input, ctx) => {
      stageCtxs.push(ctx);
      const routed = await conditional(input, routeBranches(workerCtxs, branchCtxs, order), {
        workflowId: ctx.workflowId,
        metadata: { ...ctx.metadata, stage: "route" },
      });
      if (!routed.success) throw routed.error;
      return routed.output;
    },
  };
}

describe("P5.10 workflow pipeline integration (S15)", () => {
  it("TC01_threads_output_and_context_through_sequential_conditional_parallel", async () => {
    const stageCtxs: WorkflowContext[] = [];
    const workerCtxs: WorkflowContext[] = [];
    const branchCtxs: WorkflowContext[] = [];
    const order: string[] = [];

    const result = await sequential(
      [normalize(stageCtxs), routeStage(stageCtxs, workerCtxs, branchCtxs, order), aggregate(stageCtxs, order)],
      "42",
      { workflowId: "pipe-1", metadata: { tenant: "acme" } },
    );

    // 42 > 10 → fanout branch → workers return 42+0, 42+1, 42+2 → 129
    expect(result.success).toBe(true);
    expect(result.output).toEqual({ total: 129 });
    expect(order).toEqual(["fanout", "aggregate"]);

    // Outer sequential context flows into every stage (stepIndex 0..2).
    expect(stageCtxs.map((c) => c.stepIndex)).toEqual([0, 1, 2]);
    for (const c of stageCtxs) expect(c.workflowId).toBe("pipe-1");
    // sequential shares ONE metadata object across stages (no per-stage tags).
    expect(stageCtxs[1]!.metadata).toBe(stageCtxs[0]!.metadata);
    expect(stageCtxs[1]?.metadata).toMatchObject({ tenant: "acme" });

    // conditional tags ONLY the branch-step ctx (stage + branch from routeStage).
    expect(branchCtxs).toHaveLength(1);
    expect(branchCtxs[0]!.stepIndex).toBe(0);
    expect(branchCtxs[0]!.workflowId).toBe("pipe-1");
    expect(branchCtxs[0]!.metadata).toMatchObject({ tenant: "acme", stage: "route", branch: "fanout" });

    // fan stage re-broadcasts {...branchCtx.metadata, stage: "fan"} to workers.
    expect(workerCtxs).toHaveLength(3);
    expect(workerCtxs.map((c) => c.stepIndex).sort()).toEqual([0, 1, 2]);
    for (const w of workerCtxs) {
      expect(w.workflowId).toBe("pipe-1");
      expect(w.metadata).toMatchObject({ tenant: "acme", branch: "fanout", stage: "fan" });
    }
  });

  it("TC02_nested_parallel_failure_aborts_the_whole_pipeline", async () => {
    const stageCtxs: WorkflowContext[] = [];
    const order: string[] = [];
    const exploding: WorkflowStep<unknown, number>[] = [0, 1].map((i) => ({
      name: `worker-${i}`,
      execute: async () => {
        if (i === 1) throw new Error("boom");
        return 1;
      },
    }));

    const stage: WorkflowStep<unknown, unknown> = {
      name: "fanout",
      execute: async (_input, ctx) => {
        order.push("fanout");
        const results = await parallel<number>(exploding, { workflowId: ctx.workflowId });
        const failed = results.find((r) => !r.success);
        if (failed) throw failed.error;
        return results.reduce((sum, r) => sum + (r.output ?? 0), 0);
      },
    };

    const result = await sequential([normalize(stageCtxs), stage, aggregate(stageCtxs, order)], "5");

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("boom");
    // Terminal stage must never run after a nested failure.
    expect(order).toEqual(["fanout"]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("TC03_fallback_branch_keeps_the_pipeline_alive", async () => {
    const stageCtxs: WorkflowContext[] = [];
    const workerCtxs: WorkflowContext[] = [];
    const branchCtxs: WorkflowContext[] = [];
    const order: string[] = [];

    const result = await sequential(
      [normalize(stageCtxs), routeStage(stageCtxs, workerCtxs, branchCtxs, order), aggregate(stageCtxs, order)],
      "3",
      { workflowId: "pipe-2" },
    );

    // 3 <= 10 → solo branch → 3*2 = 6
    expect(result.success).toBe(true);
    expect(result.output).toEqual({ total: 6 });
    expect(order).toEqual(["solo", "aggregate"]);
    expect(workerCtxs).toHaveLength(0);

    // The fallback branch step got the `solo` branch tag.
    expect(branchCtxs).toHaveLength(1);
    expect(branchCtxs[0]!.workflowId).toBe("pipe-2");
    expect(branchCtxs[0]!.metadata["branch"]).toBe("solo");
  });
});
