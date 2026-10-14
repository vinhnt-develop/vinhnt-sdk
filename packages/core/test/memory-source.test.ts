import { describe, expect, it } from "vitest";
import { createContextRegistry, createMemorySource, DEFAULT_MEMORY_SOURCE_PRIORITY } from "../src/index.js";
import type { MemorySourceLoader, MemorySourceOptions } from "../src/index.js";

describe("createMemorySource (G6.1)", () => {
  it("renders the memory block with the default '## Memory' heading", async () => {
    const source = createMemorySource(() => "## tooling\n- pnpm only");
    expect(await source.load()).toBe("## tooling\n- pnpm only");
    expect(source.renderBaseline(await source.load())).toBe("## Memory\n\n## tooling\n- pnpm only");
    expect(source.priority).toBe(45);
    expect(source.key).toBe("agent.memory");
  });

  it("renders nothing when memory is empty or the loader returns undefined", async () => {
    const empty = createMemorySource(() => "");
    expect(empty.renderBaseline(await empty.load())).toBe("");
    const missing: MemorySourceLoader = async () => undefined;
    const source = createMemorySource(missing);
    expect(await source.load()).toBe("");
    expect(source.renderBaseline(await source.load())).toBe("");
    expect(source.renderRemoval()).toBe("");
  });

  it("supports custom heading/key/priority", async () => {
    const options: MemorySourceOptions = { key: "custom.memory", priority: 10, heading: "### Recall" };
    const source = createMemorySource(() => "- fact", options);
    expect(source.key).toBe("custom.memory");
    expect(source.priority).toBe(10);
    expect(source.renderBaseline(await source.load())).toBe("### Recall\n\n- fact");
    expect(DEFAULT_MEMORY_SOURCE_PRIORITY).toBe(45);
  });

  it("feeds the system-context registry (baseline + reconcile update)", async () => {
    let memory = "## user\n- terse replies";
    const registry = createContextRegistry();
    registry.register(createMemorySource(async () => memory));
    const baseline = await registry.initialize();
    expect(baseline.baseline).toContain("## Memory");
    expect(baseline.baseline).toContain("terse replies");

    memory = "## user\n- terse replies\n- uses pnpm";
    const reconcile = await registry.reconcile();
    expect(reconcile.type).toBe("updated");
    if (reconcile.type === "updated") {
      expect(reconcile.update).toContain("uses pnpm");
    }

    memory = "## user\n- terse replies\n- uses pnpm";
    expect((await registry.reconcile()).type).toBe("unchanged");
  });
});
