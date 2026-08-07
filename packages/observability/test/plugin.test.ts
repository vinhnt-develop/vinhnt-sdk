import { describe, expect, it, vi } from "vitest";
import { createObservabilityPlugin } from "../src/plugin.js";

describe("createObservabilityPlugin", () => {
  it("creates plugin with manifest", () => {
    const plugin = createObservabilityPlugin({ namespace: "test" });
    expect(plugin.manifest.id).toBe("observability");
    expect(plugin.manifest.version).toBe("1.0.0");
  });

  it("activate does not throw", async () => {
    const plugin = createObservabilityPlugin();
    await expect(plugin.activate({} as never)).resolves.toBeUndefined();
  });

  it("deactivate does not throw", async () => {
    const plugin = createObservabilityPlugin();
    await expect(plugin.deactivate?.()).resolves.toBeUndefined();
  });

  it("hooks are defined", () => {
    const plugin = createObservabilityPlugin();
    expect(plugin.hooks).toBeDefined();
    expect(plugin.hooks!.onRunStarted).toBeDefined();
    expect(plugin.hooks!.onStepCompleted).toBeDefined();
    expect(plugin.hooks!.onRunCompleted).toBeDefined();
    expect(plugin.hooks!.onToolInvoked).toBeDefined();
    expect(plugin.hooks!.onToolCompleted).toBeDefined();
    expect(plugin.hooks!.onToolFailed).toBeDefined();
    expect(plugin.hooks!.onContextCompressed).toBeDefined();
  });

  it("onRunStarted logs without throwing", async () => {
    const plugin = createObservabilityPlugin();
    await expect(plugin.hooks!.onRunStarted!({ runId: "r1", prompt: "hello" })).resolves.toBeUndefined();
  });

  it("onStepCompleted logs without throwing", async () => {
    const plugin = createObservabilityPlugin();
    await expect(plugin.hooks!.onStepCompleted!({ step: 1, toolCallCount: 2 })).resolves.toBeUndefined();
  });

  it("onRunCompleted with error logs without throwing", async () => {
    const plugin = createObservabilityPlugin();
    await expect(plugin.hooks!.onRunCompleted!({ status: "failed", error: "boom" })).resolves.toBeUndefined();
  });

  it("onRunCompleted with success logs without throwing", async () => {
    const plugin = createObservabilityPlugin();
    await expect(plugin.hooks!.onRunCompleted!({ status: "succeeded", output: "done" })).resolves.toBeUndefined();
  });

  it("onToolInvoked returns null (no mutation)", async () => {
    const plugin = createObservabilityPlugin();
    const result = await plugin.hooks!.onToolInvoked!({ toolId: "t1", toolName: "read_file", input: { path: "x" } });
    expect(result).toBeNull();
  });

  it("onToolCompleted returns null (no mutation)", async () => {
    const plugin = createObservabilityPlugin();
    const result = await plugin.hooks!.onToolCompleted!({ toolId: "t1", toolName: "read_file", output: "data" });
    expect(result).toBeNull();
  });

  it("onToolFailed logs without throwing", async () => {
    const plugin = createObservabilityPlugin();
    await expect(plugin.hooks!.onToolFailed!({ toolId: "t1", toolName: "bash", error: "killed" })).resolves.toBeUndefined();
  });

  it("onContextCompressed logs without throwing", async () => {
    const plugin = createObservabilityPlugin();
    await expect(plugin.hooks!.onContextCompressed!({ originalCount: 100, compressedCount: 30 })).resolves.toBeUndefined();
  });
});
