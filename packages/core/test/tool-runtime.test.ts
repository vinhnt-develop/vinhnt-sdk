import { describe, expect, it } from "vitest";
import { ToolRuntime } from "../src/tool/runtime.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeApprovalStore } from "../src/fakes/fake-approval-store.js";
import { PermissionGate } from "@vinhnt-sdk/step-executor";

function makeGate(): PermissionGate {
  return new PermissionGate({
    store: new FakeRunEventStore(),
    pluginManager: undefined,
    approvalStore: new FakeApprovalStore(),
  });
}

describe("ToolRuntime permission gate fail-closed (RV-41)", () => {
  it("denies execution when no permission gate is configured (fail-closed)", async () => {
    const rt = new ToolRuntime();
    const tool = new FakeTool("safe_tool", async () => "ran");
    rt.register(tool);

    const result = await rt.execute("safe_tool", {});
    expect(result.status).toBe("denied");
    expect((result as { reason: string }).reason).toContain("no permission gate configured");
  });

  it("executes when the gate allows", async () => {
    const rt = new ToolRuntime({ permissionGate: makeGate() });
    const tool = new FakeTool("safe_tool", async () => "ran");
    rt.register(tool);

    const result = await rt.execute("safe_tool", {});
    expect(result.status).toBe("success");
    expect(result).toEqual({ status: "success", output: "ran" });
  });

  it("denies when the gate denies the tool", async () => {
    const gate = makeGate();
    gate.setTopLevelRules({ allow: [], deny: ["safe_tool"], ask: [] });
    const rt = new ToolRuntime({ permissionGate: gate });
    const tool = new FakeTool("safe_tool", async () => "ran");
    rt.register(tool);

    const result = await rt.execute("safe_tool", {});
    expect(result.status).toBe("denied");
  });

  it("denies when the gate requires approval with no handler configured", async () => {
    const gate = makeGate();
    gate.setTopLevelRules({ allow: [], deny: [], ask: ["write_tool(*)"] });
    const rt = new ToolRuntime({ permissionGate: gate });
    const tool = new FakeTool("write_tool", async () => "wrote", undefined, "write");
    rt.register(tool);

    const result = await rt.execute("write_tool", { path: "p" });
    expect(result.status).toBe("denied");
    expect((result as { reason: string }).reason).toContain("requires approval");
  });
});