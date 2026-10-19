import { describe, it, expect } from "vitest";
import { createRenderUiTool } from "@vinhnt-sdk/tools";
import type { UiSurface } from "@vinhnt-sdk/schema";

const ctx = { presentSurface: () => {} } as never;

describe("createRenderUiTool", () => {
  it("returns a tool with correct id and risk", () => {
    const tool = createRenderUiTool();
    expect(tool.id).toBe("render_ui");
    expect(tool.risk).toBe("read");
  });

  it("emits the normalized surface via ctx.presentSurface", async () => {
    let captured: UiSurface | undefined;
    const tool = createRenderUiTool();
    const result = (await tool.execute(
      {
        surfaceId: "revenue",
        title: "Revenue",
        components: [
          { type: "markdown", markdown: "## Q3" },
          { type: "keyValue", items: [{ label: "Total", value: "42" }] },
        ],
      },
      { presentSurface: (s: UiSurface) => { captured = s; } } as never,
    )) as { ok: boolean; surfaceId: string; components: number };

    expect(result.ok).toBe(true);
    expect(result.surfaceId).toBe("revenue");
    expect(result.components).toBe(2);
    expect(captured?.title).toBe("Revenue");
    expect(captured?.components).toHaveLength(2);
  });

  it("generates a surfaceId when omitted", async () => {
    let captured: UiSurface | undefined;
    const tool = createRenderUiTool();
    const result = (await tool.execute(
      { components: [{ type: "text", text: "hi" }] },
      { presentSurface: (s: UiSurface) => { captured = s; } } as never,
    )) as { surfaceId: string };
    expect(result.surfaceId).toBeTruthy();
    expect(captured?.surfaceId).toBe(result.surfaceId);
  });

  it("drops components outside the approved catalog", async () => {
    let captured: UiSurface | undefined;
    const tool = createRenderUiTool();
    const result = (await tool.execute(
      {
        surfaceId: "s1",
        components: [
          { type: "text", text: "keep" },
          { type: "script", code: "alert(1)" },
          { type: "iframe", src: "x" },
        ],
      },
      { presentSurface: (s: UiSurface) => { captured = s; } } as never,
    )) as { components: number; droppedComponents?: number };

    expect(result.components).toBe(1);
    expect(result.droppedComponents).toBe(2);
    expect(captured?.components).toEqual([{ type: "text", text: "keep" }]);
  });

  it("returns an error when no component is valid", async () => {
    const tool = createRenderUiTool();
    const result = (await tool.execute(
      { surfaceId: "s1", components: [{ type: "nope" }] },
      ctx,
    )) as { error?: string };
    expect(result.error).toContain("No valid components");
  });

  it("emits a delete surface for action=delete", async () => {
    let captured: UiSurface | undefined;
    const tool = createRenderUiTool();
    const result = (await tool.execute(
      { surfaceId: "s1", action: "delete", components: [] },
      { presentSurface: (s: UiSurface) => { captured = s; } } as never,
    )) as { ok: boolean; action: string };
    expect(result.ok).toBe(true);
    expect(result.action).toBe("delete");
    expect(captured?.components).toEqual([]);
  });

  it("reports an error when the host has no presentSurface", async () => {
    const tool = createRenderUiTool();
    const result = (await tool.execute(
      { surfaceId: "s1", components: [{ type: "text", text: "x" }] },
      {} as never,
    )) as { error?: string };
    expect(result.error).toContain("not supported");
  });
});
