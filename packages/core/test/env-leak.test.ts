import { describe, expect, it } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import type { ToolContext } from "@vinhnt-sdk/tools";
import type { RequestContext, RequestId, TraceId } from "@vinhnt-sdk/schema";

const testCtx: RequestContext = {
  requestId: "req_env" as RequestId,
  traceId: "trace_env" as TraceId,
  actorId: "test",
  tenantId: "default",
};

describe("P1-G no env leak", () => {
  it("tools never receive raw process.env in ctx.env", async () => {
    // Plant fake secrets into the process environment.
    const prev = new Map<string, string | undefined>();
    for (const key of ["AWS_ACCESS_KEY_ID", "GITHUB_TOKEN", "DATABASE_URL", "MY_LEAK_SENTINEL"]) {
      prev.set(key, process.env[key]);
      process.env[key] = "super-secret-value";
    }
    try {
      let capturedEnv: Record<string, string> | undefined;
      const envProbe = new FakeTool("env_probe", async (_input, ctx: ToolContext) => {
        capturedEnv = ctx.env;
        return "ok";
      });

      const model = new FakeModelProvider([
        { content: "Checking env", toolCalls: [{ id: "c1", name: "env_probe", args: {} }] },
        { content: "Done", toolCalls: [] },
      ]);
      const store = new FakeRunEventStore();
      const kernel = new AgentKernel({ model, store, tools: [envProbe], maxSteps: 3 });

      const handle = kernel.createRunHandle("inspect env", testCtx);
      const result = await handle.completed;
      expect(result.status).toBe("succeeded");

      expect(capturedEnv).toBeDefined();
      // Host secrets never reach the tool context.
      expect(capturedEnv?.AWS_ACCESS_KEY_ID).toBeUndefined();
      expect(capturedEnv?.GITHUB_TOKEN).toBeUndefined();
      expect(capturedEnv?.DATABASE_URL).toBeUndefined();
      expect(capturedEnv?.MY_LEAK_SENTINEL).toBeUndefined();
      // A whitelisted var is still available (e.g. PATH).
      expect(Object.keys(capturedEnv ?? {})).toContain("PATH");
    } finally {
      for (const [key, value] of prev) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});