import { describe, it, expect } from "vitest";
import {
  SessionCreateParamsSchema,
  TaskStartParamsSchema,
  TaskCancelParamsSchema,
  JsonRpcRequestSchema,
  AcpMethods,
} from "../src/client/acp-types.js";

describe("ACP types", () => {
  it("validates JSON-RPC request", () => {
    const req = { jsonrpc: "2.0" as const, id: 1, method: "ping" };
    const result = JsonRpcRequestSchema.safeParse(req);
    expect(result.success).toBe(true);
  });

  it("rejects invalid JSON-RPC", () => {
    const req = { id: 1 };
    const result = JsonRpcRequestSchema.safeParse(req);
    expect(result.success).toBe(false);
  });

  it("validates session/create params", () => {
    const valid = SessionCreateParamsSchema.safeParse({
      clientId: "test-client",
      clientName: "Test Editor",
      capabilities: { theme: "dark", languages: ["typescript"] },
    });
    expect(valid.success).toBe(true);

    const invalid = SessionCreateParamsSchema.safeParse({});
    expect(invalid.success).toBe(false);
  });

  it("validates task/start params", () => {
    const valid = TaskStartParamsSchema.safeParse({
      sessionId: "sess-1",
      prompt: "Hello world",
    });
    expect(valid.success).toBe(true);

    const invalid = TaskStartParamsSchema.safeParse({ prompt: "hi" });
    expect(invalid.success).toBe(false);
  });

  it("validates task/cancel params", () => {
    const valid = TaskCancelParamsSchema.safeParse({ taskId: "task-1" });
    expect(valid.success).toBe(true);
  });

  it("has correct method constants", () => {
    expect(AcpMethods.SessionCreate).toBe("session/create");
    expect(AcpMethods.TaskStart).toBe("task/start");
    expect(AcpMethods.TaskCancel).toBe("task/cancel");
    expect(AcpMethods.Ping).toBe("ping");
  });
});
