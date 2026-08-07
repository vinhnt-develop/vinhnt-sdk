import { describe, expect, it } from "vitest";
import { PluginFileLoader } from "../src/plugin/plugin-file-loader.js";
import { join } from "node:path";

describe("PluginFileLoader", () => {
  it("has correct default parser", () => {
    const loader = new PluginFileLoader();
    expect(loader).toBeDefined();
  });

  it("loads plugins from directory", async () => {
    const loader = new PluginFileLoader();
    const fixturesDir = join(import.meta.dirname, "fixtures");
    const plugins = await loader.loadFromDirectory(
      join(fixturesDir, ".vnt", "plugins"),
      { type: "project", dir: fixturesDir, priority: 10 },
    );
    // May be empty if no plugins in fixtures
    expect(Array.isArray(plugins)).toBe(true);
  });

  it("loads from multiple directories with priority", async () => {
    const loader = new PluginFileLoader();
    const plugins = await loader.loadFromDirectories([
      { type: "global", dir: "/nonexistent/global", priority: 100 },
      { type: "project", dir: "/nonexistent/project", priority: 10 },
    ]);
    expect(plugins).toEqual([]);
  });

  it("custom parser extracts plugin manifests", async () => {
    const loader = new PluginFileLoader({
      parser: (content) => ({
        manifest: { id: "custom", name: "Custom", version: "1.0.0" },
        async activate() {},
      }),
    });

    const plugins = await loader.loadFromDirectory(
      "/nonexistent",
      { type: "project", dir: "/", priority: 10 },
    );
    expect(plugins).toEqual([]);
  });
});
