import { describe, expect, it } from "vitest";
import { definePlugin } from "../src/index.js";

describe("@vinhnt-sdk/plugin", () => {
  it("definePlugin returns plugin shape with default activate", async () => {
    const plugin = definePlugin({
      id: "test-plugin",
      name: "Test Plugin",
      version: "1.0.0",
    });

    expect(plugin.manifest.id).toBe("test-plugin");
    expect(plugin.manifest.name).toBe("Test Plugin");
    expect(plugin.manifest.version).toBe("1.0.0");

    await plugin.activate({} as never);
    await plugin.deactivate?.();
  });

  it("definePlugin accepts optional hooks", () => {
    const onRunStarted = async () => {};
    const plugin = definePlugin(
      { id: "hooks-plugin", name: "Hooks Plugin", version: "0.1.0" },
      { onRunStarted },
    );

    expect(plugin.hooks?.onRunStarted).toBe(onRunStarted);
  });
});
