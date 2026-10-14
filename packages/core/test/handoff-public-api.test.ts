import { describe, expect, it } from "vitest";
import type { AgentId } from "@vinhnt-sdk/schema";
import type { ToolContext } from "@vinhnt-sdk/tools";
import { createHandoffTool, isHandoff } from "../src/index.js";
import { createHandoffTool as fromModule } from "../src/kernel/handoff.js";

function makeToolCtx(): ToolContext {
  return {
    sessionId: "",
    runId: "",
    agentId: "",
    agentName: "",
    signal: new AbortController().signal,
    env: {},
    ask: async () => "reject",
    metadata: () => {},
    setCompensation: () => {},
  };
}

describe("P2.6 public handoff API", () => {
  it("barrel createHandoffTool is the handoff-object implementation", () => {
    // The barrel must NOT point at a string-marker variant — the run-loop
    // only detects Handoff objects (HANDOFF_SYMBOL / __handoff).
    expect(createHandoffTool).toBe(fromModule);
  });

  it("executing the exported tool returns a detectable Handoff", async () => {
    const tool = createHandoffTool({
      agentId: "specialist" as AgentId,
      toolDescription: "Hand to specialist",
    });

    const result = await tool.execute(
      { reason: "delegating", summary: "context so far" },
      makeToolCtx(),
    );

    expect(isHandoff(result)).toBe(true);
    if (isHandoff(result)) {
      expect(result.targetAgentId).toBe("specialist");
      expect(result.reason).toBe("delegating");
      expect(result.summary).toBe("context so far");
    }
  });

  it("tool name defaults to transfer_to_{agentId}", () => {
    const tool = createHandoffTool({
      agentId: "billing" as AgentId,
      toolDescription: "Hand to billing",
    });
    expect(tool.id).toBe("transfer_to_billing");
    expect(tool.risk).toBe("write");
  });
});
