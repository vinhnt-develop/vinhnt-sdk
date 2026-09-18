import { describe, it, expect } from "vitest";
import { runGuardrails, maxLengthGuardrail, blocklistGuardrail, secretDetectionGuardrail } from "../src/index.js";
import type { GuardrailContext } from "../src/index.js";

function makeCtx(direction: "input" | "output", content: unknown): GuardrailContext {
  return { direction, content, toolName: "test" };
}

describe("maxLengthGuardrail", () => {
  it("allows short input", async () => {
    const guard = maxLengthGuardrail(100);
    const result = await guard.check(makeCtx("input", "hello"));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("allow");
  });

  it("denies long input", async () => {
    const guard = maxLengthGuardrail(5);
    const result = await guard.check(makeCtx("input", "hello world"));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("exceeds");
  });
});

describe("blocklistGuardrail", () => {
  it("allows clean content", async () => {
    const guard = blocklistGuardrail([/spam/gi]);
    const result = await guard.check(makeCtx("input", "hello world"));
    expect(result.passed).toBe(true);
  });

  it("denies blocked content", async () => {
    const guard = blocklistGuardrail([/spam/gi]);
    const result = await guard.check(makeCtx("input", "this is spam content"));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("deny");
  });
});

describe("secretDetectionGuardrail", () => {
  it("passes through clean content", async () => {
    const redactor = { redact: (text: string) => text };
    const guard = secretDetectionGuardrail(redactor);
    const result = await guard.check(makeCtx("output", "hello"));
    expect(result.passed).toBe(true);
    expect(result.modifiedContent).toBeUndefined();
  });

  it("redacts secrets", async () => {
    const redactor = { redact: (text: string) => text.replace(/secret/gi, "[REDACTED]") };
    const guard = secretDetectionGuardrail(redactor);
    const result = await guard.check(makeCtx("output", "my secret is here"));
    expect(result.passed).toBe(true);
    expect(result.modifiedContent).toBe("my [REDACTED] is here");
  });
});

describe("runGuardrails", () => {
  it("runs in priority order", async () => {
    const order: number[] = [];
    const g1 = {
      name: "g1", scope: "input" as const, priority: 20,
      check: async () => { order.push(1); return { passed: true, decision: "allow" as const }; },
    };
    const g2 = {
      name: "g2", scope: "input" as const, priority: 10,
      check: async () => { order.push(2); return { passed: true, decision: "allow" as const }; },
    };
    await runGuardrails([g1, g2], makeCtx("input", "test"));
    expect(order).toEqual([2, 1]);
  });

  it("monotonic deny stops evaluation", async () => {
    let g2Called = false;
    const g1 = {
      name: "g1", scope: "input" as const, priority: 10,
      check: async () => ({ passed: false, decision: "deny" as const, reason: "blocked" }),
    };
    const g2 = {
      name: "g2", scope: "input" as const, priority: 20,
      check: async () => { g2Called = true; return { passed: true, decision: "allow" as const }; },
    };
    const result = await runGuardrails([g1, g2], makeCtx("input", "test"));
    expect(result.decision).toBe("deny");
    expect(g2Called).toBe(false);
  });

  it("filters by scope", async () => {
    let gCalled = false;
    const g = {
      name: "g", scope: "output" as const, priority: 10,
      check: async () => { gCalled = true; return { passed: true, decision: "allow" as const }; },
    };
    await runGuardrails([g], makeCtx("input", "test"));
    expect(gCalled).toBe(false);
  });
});
