/**
 * P5.10 (S15) — guardrails integration gate.
 *
 * guardrails.test.ts covers each tripwire in isolation with fake redactors.
 * This file composes the tripwires with the REAL @vinhnt-sdk/guard secret
 * redaction and asserts the cross-guardrail semantics that only appear when
 * runGuardrails() drives the whole pipeline: escalate carry across priorities,
 * deny short-circuit ordering, scope filtering, and redaction flowing through
 * as modifiedContent on an allow decision.
 */

import { describe, it, expect } from "vitest";
import { redactSecrets, detectSecrets } from "@vinhnt-sdk/guard";
import {
  runGuardrails,
  maxLengthGuardrail,
  blocklistGuardrail,
  secretDetectionGuardrail,
} from "../src/index.js";
import type { Guardrail, GuardrailContext } from "../src/index.js";

/** OpenAI-shaped key that matches guard's `openai-key` pattern (sk- + 20+ chars). */
const OPENAI_KEY = `sk-${"abcdefghij1234567890ABCD"}`;

function ctx(direction: "input" | "output", content: unknown): GuardrailContext {
  return { direction, toolName: "wire", content };
}

/** Wraps a guardrail so the test can observe whether its check ran. */
function spy(guardrail: Guardrail, counter: { checks: number }): Guardrail {
  return {
    ...guardrail,
    check: async (c) => {
      counter.checks += 1;
      return guardrail.check(c);
    },
  };
}

describe("P5.10 guardrails + real guard redaction integration (S15)", () => {
  it("TC01_real_secret_is_redacted_end_to_end_and_context_stays_intact", async () => {
    const raw = `tool output leaked token ${OPENAI_KEY} here`;
    // The secret is real per guard's detector before any guardrail runs.
    expect(detectSecrets(raw)).toContain("openai-key");

    const wireCtx = ctx("output", raw);
    const result = await runGuardrails(
      [secretDetectionGuardrail({ redact: redactSecrets })],
      wireCtx,
    );

    expect(result.passed).toBe(true);
    expect(result.decision).toBe("allow");
    // runGuardrails only assigns `reason` from deny/escalate results — an
    // allow + modifiedContent carry keeps the result reasonless by contract.
    expect(result.reason).toBeUndefined();

    const modified = String(result.modifiedContent);
    expect(modified).not.toContain(OPENAI_KEY);
    expect(modified).toContain("[REDACTED");
    // Redacted output is clean per the real detector, not a fake one.
    expect(detectSecrets(modified)).toEqual([]);
    // The pipeline never mutates the context it was handed.
    expect(wireCtx.content).toBe(raw);
  });

  it("TC02_escalate_is_carried_across_priorities_and_deny_still_wins", async () => {
    const escalateGuard: Guardrail = {
      name: "needs-review",
      scope: "output",
      priority: 10,
      check: async () => ({ passed: true, decision: "escalate", reason: "needs human review" }),
    };
    const allowGuard: Guardrail = {
      name: "ok",
      scope: "output",
      priority: 20,
      check: async () => ({ passed: true, decision: "allow" }),
    };
    const denyGuard: Guardrail = {
      name: "block",
      scope: "output",
      priority: 30,
      check: async () => ({ passed: false, decision: "deny", reason: "blocked" }),
    };

    // escalate (10) then allow (20): a later allow must NOT downgrade the carry.
    const carry = await runGuardrails([allowGuard, escalateGuard], ctx("output", "text"));
    expect(carry.decision).toBe("escalate");
    expect(carry.reason).toBe("needs human review");

    // escalate (10) ... deny (30): deny takes precedence over the carried escalate.
    const overruled = await runGuardrails([escalateGuard, denyGuard, allowGuard], ctx("output", "text"));
    expect(overruled.decision).toBe("deny");
    expect(overruled.reason).toBe("blocked");
  });

  it("TC03_input_pipeline_short_circuits_on_deny_and_skips_output_only_guards", async () => {
    const blocklistCounter = { checks: 0 };
    const secretCounter = { checks: 0 };
    const blocklist = spy(blocklistGuardrail([/DROP TABLE/gi]), blocklistCounter);
    const secret = spy(secretDetectionGuardrail({ redact: redactSecrets }), secretCounter);

    // Long enough to trip maxLength (priority 10) AND blocked by pattern (20).
    const content = `very long input that exceeds the cap and contains DROP TABLE users`;
    const result = await runGuardrails(
      [blocklist, maxLengthGuardrail(10, "wire"), secret],
      ctx("input", content),
    );

    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("exceeds 10");
    // Monotonic deny: the higher-priority blocklist never ran.
    expect(blocklistCounter.checks).toBe(0);
    // Scope filter: the output-only secret guard is not even considered on input.
    expect(secretCounter.checks).toBe(0);
  });

  it("TC04_redaction_result_survives_later_allowing_guards", async () => {
    const raw = `ok output: ${OPENAI_KEY}`;
    const secret = secretDetectionGuardrail({ redact: redactSecrets });
    const audit: Guardrail = {
      name: "audit",
      scope: "output",
      priority: 40,
      check: async () => ({ passed: true, decision: "allow" }),
    };

    const result = await runGuardrails(
      [secret, maxLengthGuardrail(500, "wire"), audit],
      ctx("output", raw),
    );

    expect(result.passed).toBe(true);
    expect(result.decision).toBe("allow");
    const modified = String(result.modifiedContent);
    expect(modified).not.toContain(OPENAI_KEY);
    expect(detectSecrets(modified)).toEqual([]);
    // modifiedContent carried across BOTH later guards (maxLength, audit).
    expect(result.modifiedContent).toBeDefined();
  });
});
