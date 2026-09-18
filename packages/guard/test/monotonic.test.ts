import { describe, it, expect } from "vitest";
import { evaluateGuards } from "../src/index.js";
import type { ToolGuard, ToolGuardContext, ToolGuardInput } from "../src/index.js";

function makeGuard(name: string, decision: "allow" | "deny" | "escalate"): ToolGuard {
  return {
    name,
    check: async () => ({ decision, reason: `${name} says ${decision}` }),
  };
}

const ctx: ToolGuardContext = { toolId: "test-tool" };
const input: ToolGuardInput = { toolName: "read_file", input: {} };

describe("evaluateGuards (monotonic)", () => {
  it("allows when all guards allow", async () => {
    const result = await evaluateGuards(
      [makeGuard("g1", "allow"), makeGuard("g2", "allow")],
      ctx,
      input,
    );
    expect(result.decision).toBe("allow");
  });

  it("deny takes precedence over allow", async () => {
    const result = await evaluateGuards(
      [makeGuard("g1", "allow"), makeGuard("g2", "deny")],
      ctx,
      input,
    );
    expect(result.decision).toBe("deny");
  });

  it("escalate when not denied", async () => {
    const result = await evaluateGuards(
      [makeGuard("g1", "allow"), makeGuard("g2", "escalate")],
      ctx,
      input,
    );
    expect(result.decision).toBe("escalate");
  });

  it("deny is monotonic — later guards cannot override", async () => {
    const result = await evaluateGuards(
      [makeGuard("g1", "deny"), makeGuard("g2", "allow")],
      ctx,
      input,
    );
    expect(result.decision).toBe("deny");
  });

  it("deny stops evaluation early", async () => {
    let g2Called = false;
    const g2: ToolGuard = {
      name: "g2",
      check: async () => { g2Called = true; return { decision: "allow" as const }; },
    };
    await evaluateGuards(
      [makeGuard("g1", "deny"), g2],
      ctx,
      input,
    );
    expect(g2Called).toBe(false);
  });

  it("empty guards defaults to allow", async () => {
    const result = await evaluateGuards([], ctx, input);
    expect(result.decision).toBe("allow");
  });
});
