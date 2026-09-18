import { describe, it, expect } from "vitest";
import { parallel, sequential, conditional } from "../src/index.js";
import type { WorkflowStep, ConditionalBranch } from "../src/index.js";

function makeStep(name: string, result: unknown): WorkflowStep {
  return {
    name,
    execute: async () => result,
  };
}

function makeFailingStep(name: string, error: string): WorkflowStep {
  return {
    name,
    execute: async () => { throw new Error(error); },
  };
}

describe("parallel", () => {
  it("executes all steps concurrently", async () => {
    const results = await parallel([
      makeStep("a", 1),
      makeStep("b", 2),
      makeStep("c", 3),
    ]);
    expect(results).toHaveLength(3);
    expect(results[0]?.output).toBe(1);
    expect(results[1]?.output).toBe(2);
    expect(results[2]?.output).toBe(3);
  });

  it("all succeed", async () => {
    const results = await parallel([
      makeStep("a", "ok"),
      makeStep("b", "ok"),
    ]);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it("handles failures", async () => {
    const results = await parallel([
      makeStep("a", "ok"),
      makeFailingStep("b", "boom"),
    ]);
    expect(results[0]?.success).toBe(true);
    expect(results[1]?.success).toBe(false);
    expect(results[1]?.error?.message).toBe("boom");
  });
});

describe("sequential", () => {
  it("chains step outputs", async () => {
    const step1: WorkflowStep<number, number> = {
      name: "double",
      execute: async (input: number) => input * 2,
    };
    const step2: WorkflowStep<number, number> = {
      name: "add1",
      execute: async (input: number) => input + 1,
    };
    const result = await sequential([step1, step2], 5);
    expect(result.success).toBe(true);
    expect(result.output).toBe(11);
  });

  it("stops on failure", async () => {
    const step1: WorkflowStep = {
      name: "fail",
      execute: async () => { throw new Error("boom"); },
    };
    const step2 = makeStep("never", "reached");
    const result = await sequential([step1, step2], "input");
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("boom");
  });
});

describe("conditional", () => {
  it("executes matching branch", async () => {
    const branches: ConditionalBranch<string, string>[] = [
      {
        condition: (input) => input === "admin",
        steps: [makeStep("admin-path", "admin-result")],
        name: "admin",
      },
      {
        condition: () => true,
        steps: [makeStep("default-path", "default-result")],
        name: "default",
      },
    ];
    const result = await conditional("admin", branches);
    expect(result.success).toBe(true);
    expect(result.output).toBe("admin-result");
  });

  it("falls through to default", async () => {
    const branches: ConditionalBranch<string, string>[] = [
      {
        condition: (input) => input === "admin",
        steps: [makeStep("admin-path", "admin-result")],
        name: "admin",
      },
      {
        condition: () => true,
        steps: [makeStep("default-path", "default-result")],
        name: "default",
      },
    ];
    const result = await conditional("user", branches);
    expect(result.success).toBe(true);
    expect(result.output).toBe("default-result");
  });

  it("fails when no branch matches", async () => {
    const branches: ConditionalBranch[] = [
      {
        condition: () => false,
        steps: [makeStep("nope", "nope")],
      },
    ];
    const result = await conditional("input", branches);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("No matching branch");
  });
});
