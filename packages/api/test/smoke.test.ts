import { describe, it, expect } from "vitest";

describe("API Package", () => {
  it("TC01_exports_main_modules", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });

  it("TC02_api_module_is_callable", async () => {
    const { createApi } = await import("../src/api.js");
    expect(typeof createApi).toBe("function");
  });

  it("TC03_ws_event_module_is_callable", async () => {
    const mod = await import("../src/ws-event.js");
    expect(mod).toBeDefined();
  });
});
