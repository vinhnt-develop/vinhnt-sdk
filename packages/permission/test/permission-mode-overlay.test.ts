import { describe, expect, it } from "vitest";
import { applyPermissionMode } from "../src/index.js";
import type { ModeEffect, ModeEffectSource, PermissionMode } from "../src/index.js";

function overlay(
  mode: PermissionMode,
  effect: ModeEffect,
  source: ModeEffectSource,
  risk: string,
  toolName = "some_tool",
) {
  return applyPermissionMode({ mode, effect, source, risk, toolName });
}

describe("applyPermissionMode (G5)", () => {
  it("default mode never overlays", () => {
    expect(overlay("default", "ask", "risk", "write")).toEqual({ effect: "ask", overridden: false });
    expect(overlay("default", "allow", "rules", "read")).toEqual({ effect: "allow", overridden: false });
    expect(overlay("default", "deny", "risk", "destructive")).toEqual({ effect: "deny", overridden: false });
  });

  it("unknown modes behave like default (never widen access)", () => {
    expect(overlay("totally-custom", "ask", "risk", "write").effect).toBe("ask");
    expect(overlay("totally-custom", "deny", "risk", "destructive").effect).toBe("deny");
  });

  it("legacy ask alias behaves like default", () => {
    expect(overlay("ask", "ask", "risk", "write")).toEqual({ effect: "ask", overridden: false });
  });

  it("acceptEdits lifts only risk-floor write asks", () => {
    const lifted = overlay("acceptEdits", "ask", "risk", "write");
    expect(lifted.effect).toBe("allow");
    expect(lifted.overridden).toBe(true);
    expect(lifted.reason).toContain("acceptEdits");
    // explicit rule ask stays ask (user intent wins over the mode)
    expect(overlay("acceptEdits", "ask", "rules", "write")).toEqual({ effect: "ask", overridden: false });
    // external risk ask stays ask (not an edit)
    expect(overlay("acceptEdits", "ask", "risk", "external")).toEqual({ effect: "ask", overridden: false });
    // risk-floor deny (destructive) is NOT lifted — that is bypass's job
    expect(overlay("acceptEdits", "deny", "risk", "destructive").effect).toBe("deny");
    expect(overlay("acceptEdits", "allow", "rules", "read").effect).toBe("allow");
  });

  it("legacy edit alias behaves like acceptEdits", () => {
    expect(overlay("edit", "ask", "risk", "write").effect).toBe("allow");
    expect(overlay("edit", "ask", "rules", "write").effect).toBe("ask");
  });

  it("bypass lifts every ask plus the risk-floor deny, but not rule denies", () => {
    expect(overlay("bypass", "ask", "rules", "external").effect).toBe("allow");
    expect(overlay("bypass", "ask", "risk", "write").effect).toBe("allow");
    const lifted = overlay("bypass", "deny", "risk", "destructive");
    expect(lifted.effect).toBe("allow");
    expect(lifted.overridden).toBe(true);
    expect(lifted.reason).toContain("bypass");
    expect(overlay("bypass", "deny", "rules", "execute_command").effect).toBe("deny");
  });

  it("legacy full alias behaves like bypass", () => {
    expect(overlay("full", "deny", "risk", "destructive").effect).toBe("allow");
    expect(overlay("full", "deny", "rules", "shell").effect).toBe("deny");
  });

  it("plan hard-blocks write/destructive regardless of the base effect", () => {
    const blocked = overlay("plan", "allow", "rules", "write");
    expect(blocked.effect).toBe("deny");
    expect(blocked.overridden).toBe(true);
    expect(blocked.reason).toContain("Plan mode");
    expect(overlay("plan", "ask", "risk", "write").effect).toBe("deny");
    expect(overlay("plan", "allow", "rules", "destructive").effect).toBe("deny");
    // already-deny stays deny without an override flag
    expect(overlay("plan", "deny", "risk", "destructive")).toEqual({ effect: "deny", overridden: false });
    // read/external keep their base effect (external reads are fine in plan)
    expect(overlay("plan", "allow", "rules", "external").effect).toBe("allow");
    expect(overlay("plan", "ask", "rules", "read").effect).toBe("ask");
    expect(overlay("plan", "allow", "risk", "read").effect).toBe("allow");
  });

  it("auto escalates only the risk-floor deny to ask; rule asks/denys pass through", () => {
    const escalated = overlay("auto", "deny", "risk", "destructive");
    expect(escalated.effect).toBe("ask");
    expect(escalated.overridden).toBe(true);
    expect(escalated.reason).toContain("auto");
    expect(overlay("auto", "ask", "risk", "write")).toEqual({ effect: "ask", overridden: false });
    expect(overlay("auto", "ask", "rules", "external")).toEqual({ effect: "ask", overridden: false });
    expect(overlay("auto", "deny", "rules", "execute_command").effect).toBe("deny");
    expect(overlay("auto", "allow", "risk", "read").effect).toBe("allow");
  });
});
