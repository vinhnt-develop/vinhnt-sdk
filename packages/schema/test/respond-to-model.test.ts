import { describe, it, expect } from "vitest";
import {
  formatToolFailure,
  isToolFailureEnvelope,
  TOOL_FAILURE_HINTS,
} from "../src/contracts/errors/respond-to-model.js";

describe("formatToolFailure (P1-4 RespondToModel)", () => {
  it("returns stable envelope with ok:false", () => {
    const s = formatToolFailure("something broke");
    const parsed = JSON.parse(s);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe("something broke");
    expect(typeof parsed.hint).toBe("string");
    expect(isToolFailureEnvelope(s)).toBe(true);
  });

  it("uses catalog hint by kind", () => {
    const s = formatToolFailure("denied", undefined, "permission_denied");
    const parsed = JSON.parse(s);
    expect(parsed.hint).toBe(TOOL_FAILURE_HINTS.permission_denied);
  });

  it("explicit hint wins over catalog", () => {
    const s = formatToolFailure("e", "custom hint", "unknown");
    expect(JSON.parse(s).hint).toBe("custom hint");
  });

  it("truncates very long errors", () => {
    const long = "x".repeat(1000);
    const s = formatToolFailure(long);
    expect(JSON.parse(s).error.length).toBeLessThanOrEqual(501);
  });

  it("unknown kind falls back to default hint", () => {
    const s = formatToolFailure("e", undefined, "nope");
    expect(JSON.parse(s).hint).toBe(TOOL_FAILURE_HINTS.unknown);
  });

  it("isToolFailureEnvelope rejects plain Error prefix", () => {
    expect(isToolFailureEnvelope("Error: boom")).toBe(false);
    expect(isToolFailureEnvelope('{"ok":false')).toBe(true);
  });
});
