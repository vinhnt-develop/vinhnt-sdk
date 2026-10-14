import { describe, expect, it } from "vitest";
import { PlanStore, createGetPlanTool, createUpdatePlanTool } from "../src/index.js";
import { BuiltinToolProvider } from "../src/tool/builtin-provider.js";
import type { ToolContext } from "@vinhnt-sdk/tools";

function makeCtx(): ToolContext {
  return {
    sessionId: "s1",
    runId: "r1",
    agentId: "a1",
    agentName: "test",
    signal: new AbortController().signal,
    env: {},
    ask: async () => "reject" as const,
    metadata: () => {},
    setCompensation: () => {},
  };
}

describe("P6.7/G19 plan tools", () => {
  it("update_plan stores the plan; get_plan reads it back (shared store)", async () => {
    const store = new PlanStore();
    const update = createUpdatePlanTool(store);
    const get = createGetPlanTool(store);
    const ctx = makeCtx();

    const out = await update.execute(
      {
        steps: [
          { text: "Read codebase", status: "completed" },
          { text: "Implement feature", status: "in_progress" },
          { text: "Write tests", status: "pending" },
        ],
        explanation: "Starting implementation",
      },
      ctx,
    );
    expect(String(out)).toContain("Plan (1/3 completed)");
    expect(String(out)).toContain("Read codebase");

    const plan = await get.execute({}, ctx);
    expect(String(plan)).toContain("Plan (1/3 completed)");
    expect(String(plan)).toContain("Implement feature");
    expect(String(plan)).toContain("Note: Starting implementation");
  });

  it("get_plan without a prior update_plan returns the empty-plan message", async () => {
    const get = createGetPlanTool(new PlanStore());
    const out = await get.execute({}, makeCtx());
    expect(out).toBe("No active plan. Use update_plan to create one.");
  });

  it("update_plan rejects more than one in_progress step", async () => {
    const store = new PlanStore();
    const update = createUpdatePlanTool(store);
    const out = await update.execute(
      {
        steps: [
          { text: "A", status: "in_progress" },
          { text: "B", status: "in_progress" },
        ],
      },
      makeCtx(),
    );
    expect(String(out)).toContain("Only one step can be in_progress");
    expect(store.get()).toBeUndefined();
  });

  it("separate PlanStore instances do not leak plans between agents", async () => {
    const a = createUpdatePlanTool(new PlanStore());
    const b = createGetPlanTool(new PlanStore());
    await a.execute({ steps: [{ text: "A-only", status: "pending" }] }, makeCtx());
    const out = await b.execute({}, makeCtx());
    expect(out).toBe("No active plan. Use update_plan to create one.");
  });

  it("BuiltinToolProvider registers update_plan and get_plan sharing one store", async () => {
    const provider = new BuiltinToolProvider({
      workspaceRoot: process.cwd(),
      shell: { workspaceRoot: process.cwd(), defaultTimeoutMs: 30_000 },
    });
    const ids = provider.tools.map((t) => t.id);
    expect(ids).toContain("update_plan");
    expect(ids).toContain("get_plan");

    const ctx = makeCtx();
    const update = provider.tools.find((t) => t.id === "update_plan")!;
    const get = provider.tools.find((t) => t.id === "get_plan")!;
    await update.execute({ steps: [{ text: "shared", status: "pending" }] }, ctx);
    const out = await get.execute({}, ctx);
    expect(String(out)).toContain("shared");
  });

  it("update_plan/get_plan honor toolConfigs disable", () => {
    const provider = new BuiltinToolProvider({
      workspaceRoot: process.cwd(),
      shell: { workspaceRoot: process.cwd(), defaultTimeoutMs: 30_000 },
      toolConfigs: {
        update_plan: { enabled: false },
        get_plan: { enabled: false },
      },
    });
    const ids = provider.tools.map((t) => t.id);
    expect(ids).not.toContain("update_plan");
    expect(ids).not.toContain("get_plan");
  });
});
