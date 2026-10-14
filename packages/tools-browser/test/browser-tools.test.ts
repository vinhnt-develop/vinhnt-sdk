import { describe, expect, it, vi } from "vitest";
import { createBrowserTools } from "../src/index.js";
import type {
  BrowserDriver,
  BrowserToolsConfig,
  BrowserNavigateOptions,
  BrowserNavigationResult,
  BrowserSnapshot,
  BrowserTypeOptions,
  BrowserWaitUntil,
} from "../src/index.js";
import type { ToolContext, ToolDefinition } from "@vinhnt-sdk/tools";

function fakeCtx(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    sessionId: "s1",
    runId: "r1",
    agentId: "a1",
    agentName: "tester",
    signal: new AbortController().signal,
    env: {},
    ask: vi.fn().mockResolvedValue("reject"),
    metadata: vi.fn(),
    setCompensation: vi.fn(),
    ...overrides,
  } as ToolContext;
}

interface DriverCalls {
  navigate: ReturnType<typeof vi.fn>;
  snapshot: ReturnType<typeof vi.fn>;
  click: ReturnType<typeof vi.fn>;
  type: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

function makeDriver(withClose = true): { driver: BrowserDriver; calls: DriverCalls } {
  const calls: DriverCalls = {
    navigate: vi.fn(),
    snapshot: vi.fn(),
    click: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const driver: BrowserDriver = {
    navigate: calls.navigate,
    snapshot: calls.snapshot,
    click: calls.click,
    type: calls.type,
    ...(withClose ? { close: calls.close } : {}),
  };
  return { driver, calls };
}

function byId(tools: readonly ToolDefinition[], id: string): ToolDefinition {
  const found = tools.find((t) => t.id === id);
  if (!found) throw new Error(`missing tool ${id}`);
  return found;
}

describe("createBrowserTools (G7.3 / P2-8)", () => {
  it("barrel config + tool set: ids, risks, metadata.source, sanitize on snapshot", async () => {
    const { driver, calls } = makeDriver();
    const cfg: BrowserToolsConfig = { driver };
    const tools = createBrowserTools(cfg);

    expect(tools.map((t) => t.id)).toEqual([
      "browser_navigate",
      "browser_snapshot",
      "browser_click",
      "browser_type",
      "browser_close",
    ]);
    expect(byId(tools, "browser_snapshot").risk).toBe("read");
    for (const t of tools) {
      expect(t.risk).toBe(t.id === "browser_snapshot" ? "read" : "external");
    }
    expect(tools.every((t) => t.metadata?.source === "browser")).toBe(true);
    expect(calls.snapshot).not.toHaveBeenCalled();
  });

  it("browser_navigate forwards url + waitUntil and omits absent fields", async () => {
    const { driver, calls } = makeDriver();
    calls.navigate.mockResolvedValue({ url: "https://final.example", title: "Final" } satisfies BrowserNavigationResult);
    const tools = createBrowserTools({ driver });
    const navigate = byId(tools, "browser_navigate");

    const waitUntil: BrowserWaitUntil = "load";
    const opts: BrowserNavigateOptions = { waitUntil };
    expect(opts.waitUntil).toBe("load");
    const result = (await navigate.execute({ url: "https://start.example", waitUntil }, fakeCtx())) as Record<string, unknown>;
    expect(calls.navigate).toHaveBeenCalledWith("https://start.example", { waitUntil: "load" });
    expect(result).toEqual({ url: "https://final.example", title: "Final" });

    await navigate.execute({ url: "https://plain.example" }, fakeCtx());
    expect(calls.navigate).toHaveBeenLastCalledWith("https://plain.example", {});
  });

  it("browser_snapshot sanitizes content against ctx.sanitizeLimitChars", async () => {
    const { driver, calls } = makeDriver();
    calls.snapshot.mockResolvedValue({
      url: "https://page.example",
      title: "Page",
      content: "x".repeat(1000),
    } satisfies BrowserSnapshot);
    const tools = createBrowserTools({ driver });
    const snapshot = byId(tools, "browser_snapshot");

    const result = (await snapshot.execute({}, fakeCtx({ sanitizeLimitChars: 100 }))) as Record<string, unknown>;
    expect(String(result.content).length).toBeLessThan(1000);
    expect(result.url).toBe("https://page.example");
    expect(result.title).toBe("Page");
  });

  it("browser_click / browser_type forward selector + text with optional clear", async () => {
    const { driver, calls } = makeDriver();
    const tools = createBrowserTools({ driver });

    await byId(tools, "browser_click").execute({ selector: "#go" }, fakeCtx());
    expect(calls.click).toHaveBeenCalledWith("#go");

    const clear: BrowserTypeOptions = { clear: true };
    expect(clear.clear).toBe(true);
    await byId(tools, "browser_type").execute({ selector: "#name", text: "hello", clear: true }, fakeCtx());
    expect(calls.type).toHaveBeenLastCalledWith("#name", "hello", { clear: true });

    await byId(tools, "browser_type").execute({ selector: "#name", text: "hi" }, fakeCtx());
    expect(calls.type).toHaveBeenLastCalledWith("#name", "hi", {});
  });

  it("browser_close invokes driver.close when present and no-ops otherwise", async () => {
    const withClose = makeDriver(true);
    const toolsWith = createBrowserTools({ driver: withClose.driver });
    expect(await byId(toolsWith, "browser_close").execute({}, fakeCtx())).toEqual({ closed: true });
    expect(withClose.calls.close).toHaveBeenCalledTimes(1);

    const withoutClose = makeDriver(false);
    const toolsWithout = createBrowserTools({ driver: withoutClose.driver });
    const res = (await byId(toolsWithout, "browser_close").execute({}, fakeCtx())) as Record<string, unknown>;
    expect(res.closed).toBe(false);
    expect(withoutClose.calls.close).not.toHaveBeenCalled();
  });

  it("driver errors propagate to the caller", async () => {
    const { driver, calls } = makeDriver();
    calls.navigate.mockRejectedValue(new Error("driver exploded"));
    const tools = createBrowserTools({ driver });
    await expect(byId(tools, "browser_navigate").execute({ url: "https://x" }, fakeCtx())).rejects.toThrow(
      "driver exploded",
    );
  });

  it("zod validation rejects a missing url", async () => {
    const { driver } = makeDriver();
    const tools = createBrowserTools({ driver });
    await expect(byId(tools, "browser_navigate").execute({}, fakeCtx())).rejects.toThrow();
  });
});
