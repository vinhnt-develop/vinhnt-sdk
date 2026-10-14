import { describe, expect, it, vi } from "vitest";
import { PermissionGate } from "../src/permission-gate.js";
import type { AskForToolOptions, PermissionGateDeps } from "../src/permission-gate.js";
import { InMemoryRunEventStore } from "@vinhnt-sdk/session";
import { createCallbackPermissionClassifier } from "@vinhnt-sdk/permission";
import type { PermissionMode } from "@vinhnt-sdk/permission";
import type { RunId } from "@vinhnt-sdk/schema";

function makeGate(overrides: Partial<PermissionGateDeps> = {}): PermissionGate {
  return new PermissionGate({
    store: new InMemoryRunEventStore(),
    pluginManager: undefined,
    approvalStore: undefined,
    ...overrides,
  });
}

function ask(
  gate: PermissionGate,
  options?: AskForToolOptions,
  toolName = "write_file",
): Promise<"once" | "always" | "reject"> {
  return gate.askForTool(
    toolName, "t1", "run-1" as RunId, "ses-1",
    "needs approval", "agent-1", "trace-1",
    undefined, undefined, undefined, options,
  );
}

describe("PermissionGate mode overlay (G5)", () => {
  it("legacy behavior without a mode: write asks, destructive denies", () => {
    const gate = makeGate();
    expect(gate.checkTool("write_file", "write")).toMatchObject({ allowed: false, needsApproval: true, source: "risk" });
    expect(gate.checkTool("rm", "destructive")).toMatchObject({ allowed: false });
    expect(gate.checkTool("read_file", "read").allowed).toBe(true);
  });

  it("acceptEdits lifts risk-floor write asks only", () => {
    const gate = makeGate({ permissionMode: "acceptEdits" });
    const write = gate.checkTool("write_file", "write", { filePath: "a.txt" });
    expect(write.allowed).toBe(true);
    expect(write.reason).toContain("acceptEdits");
    // external risk ask untouched
    expect(gate.checkTool("fetch_url", "external")).toMatchObject({ allowed: false, needsApproval: true, source: "risk" });
    // destructive risk deny untouched
    expect(gate.checkTool("rm", "destructive")).toMatchObject({ allowed: false });
    // explicit rule ask not lifted
    gate.setGlobalRules({ write_file: "ask" });
    expect(gate.checkTool("write_file", "write", { filePath: "a.txt" })).toMatchObject({
      allowed: false,
      needsApproval: true,
      source: "rules",
    });
  });

  it("bypass lifts all asks and the risk-floor deny, rule deny wins", () => {
    const gate = makeGate({ permissionMode: "bypass" });
    expect(gate.checkTool("write_file", "write", { filePath: "a.txt" }).allowed).toBe(true);
    expect(gate.checkTool("fetch_url", "external").allowed).toBe(true);
    const destructive = gate.checkTool("rm", "destructive");
    expect(destructive.allowed).toBe(true);
    expect(destructive.reason).toContain("bypass");
    gate.setGlobalRules({ execute_command: "deny" });
    expect(gate.checkTool("execute_command", "destructive")).toMatchObject({ allowed: false });
  });

  it("plan denies mutating tools even when a rule allows them (snapshot included)", () => {
    const gate = makeGate({ permissionMode: "plan" });
    gate.setTopLevelRules({ allow: ["write_file"], deny: [], ask: [] });
    const blocked = gate.checkTool("write_file", "write", { filePath: "a.txt" });
    expect(blocked).toMatchObject({ allowed: false });
    expect(blocked.reason).toContain("Plan mode");
    // snapshot call (args undefined) is denied too → tool filtered from tools[]
    expect(gate.checkTool("write_file", "write", undefined).allowed).toBe(false);
    // destructive risk deny stays deny
    expect(gate.checkTool("rm", "destructive").allowed).toBe(false);
    // reads and allowed external reads pass through
    expect(gate.checkTool("read_file", "read").allowed).toBe(true);
    expect(gate.checkTool("fetch_url", "external").allowed).toBe(false); // risk-floor ask, not write/destructive
    expect(gate.checkTool("fetch_url", "external").needsApproval).toBe(true);
  });

  it("auto escalates the risk-floor deny to an ask and tags the source", () => {
    const gate = makeGate({ permissionMode: "auto" });
    const escalated = gate.checkTool("rm", "destructive");
    expect(escalated).toMatchObject({ allowed: false, needsApproval: true, source: "risk" });
    expect(escalated.reason).toContain("auto");
    expect(gate.checkTool("write_file", "write")).toMatchObject({ needsApproval: true, source: "risk" });
    // explicit rule ask keeps source "rules"; rule deny stays deny
    gate.setGlobalRules({ fetch_url: "ask", execute_command: "deny" });
    expect(gate.checkTool("fetch_url", "external")).toMatchObject({ needsApproval: true, source: "rules" });
    expect(gate.checkTool("execute_command", "destructive")).toMatchObject({ allowed: false });
  });
});

describe("PermissionGate auto classification (G5)", () => {
  const mode: PermissionMode = "auto";

  it("classifies risk asks with the default risk classifier (write auto-proceeds)", async () => {
    const gate = makeGate({ permissionMode: mode });
    await expect(ask(gate, { risk: "write", source: "risk" })).resolves.toBe("once");
  });

  it("risk asks the classifier prompts for fall through to the dialog (reject without a store)", async () => {
    const gate = makeGate({ permissionMode: mode });
    await expect(ask(gate, { risk: "destructive", source: "risk" })).resolves.toBe("reject");
    await expect(ask(gate, { risk: "external", source: "risk" })).resolves.toBe("reject");
  });

  it("explicit rule asks always open the dialog — classifier is not consulted", async () => {
    const classify = vi.fn(async () => "allow" as const);
    const gate = makeGate({
      permissionMode: mode,
      permissionClassifier: createCallbackPermissionClassifier(classify),
    });
    await expect(ask(gate, { risk: "write", source: "rules" })).resolves.toBe("reject");
    expect(classify).not.toHaveBeenCalled();
  });

  it("callers that report no source are treated fail-closed (no auto-allow)", async () => {
    const classify = vi.fn(async () => "allow" as const);
    const gate = makeGate({
      permissionMode: mode,
      permissionClassifier: createCallbackPermissionClassifier(classify),
    });
    await expect(ask(gate, { risk: "write" })).resolves.toBe("reject");
    expect(classify).not.toHaveBeenCalled();
  });

  it("an injected classifier can auto-approve what the default would prompt for", async () => {
    const gate = makeGate({
      permissionMode: mode,
      permissionClassifier: createCallbackPermissionClassifier(async () => "allow"),
    });
    await expect(ask(gate, { risk: "destructive", source: "risk", args: { command: "ls" } })).resolves.toBe("once");
  });

  it("a throwing classifier fails closed to the dialog", async () => {
    const gate = makeGate({
      permissionMode: mode,
      permissionClassifier: createCallbackPermissionClassifier(async () => {
        throw new Error("model unavailable");
      }),
    });
    await expect(ask(gate, { risk: "destructive", source: "risk" })).resolves.toBe("reject");
  });

  it("forceAsk (doom loop/guard) bypasses the classifier", async () => {
    const classify = vi.fn(async () => "allow" as const);
    const gate = makeGate({
      permissionMode: mode,
      permissionClassifier: createCallbackPermissionClassifier(classify),
    });
    await expect(ask(gate, { forceAsk: true, permissionKey: "doom_loop" })).resolves.toBe("reject");
    expect(classify).not.toHaveBeenCalled();
  });

  it("without mode 'auto' the classifier is never consulted", async () => {
    const classify = vi.fn(async () => "allow" as const);
    const gate = makeGate({ permissionClassifier: createCallbackPermissionClassifier(classify) });
    await expect(ask(gate, { risk: "write", source: "risk" })).resolves.toBe("reject");
    expect(classify).not.toHaveBeenCalled();
  });

  it("legacy autoApprovalEnabled still short-circuits before classification", async () => {
    const classify = vi.fn(async () => "ask" as const);
    const gate = makeGate({
      permissionMode: mode,
      autoApprovalEnabled: true,
      permissionClassifier: createCallbackPermissionClassifier(classify),
    });
    await expect(ask(gate, { risk: "destructive", source: "risk" })).resolves.toBe("once");
    expect(classify).not.toHaveBeenCalled();
  });
});
