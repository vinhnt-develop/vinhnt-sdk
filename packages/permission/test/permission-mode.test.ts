import { describe, expect, it } from "vitest";
import { KNOWN_PERMISSION_MODES } from "../src/index.js";
import type { KnownPermissionMode, PermissionMode } from "../src/index.js";

describe("PermissionMode vocabulary (P6.5 + G5)", () => {
  it("KNOWN_PERMISSION_MODES is the Claude-style set plus legacy aliases", () => {
    expect(KNOWN_PERMISSION_MODES).toEqual([
      "default",
      "acceptEdits",
      "plan",
      "bypass",
      "auto",
      "ask",
      "edit",
      "full",
    ]);
  });

  it("known modes are assignable to PermissionMode", () => {
    const mode: PermissionMode = KNOWN_PERMISSION_MODES[0];
    expect(mode).toBe("default");
  });

  it("open union accepts extension modes without a type change", () => {
    const extended: PermissionMode = "my-custom-mode";
    expect(extended).toBe("my-custom-mode");
  });

  it("KnownPermissionMode narrows to the known set", () => {
    const known: KnownPermissionMode[] = [...KNOWN_PERMISSION_MODES];
    expect(known).toEqual([
      "default",
      "acceptEdits",
      "plan",
      "bypass",
      "auto",
      "ask",
      "edit",
      "full",
    ]);
  });

  it("legacy P6.5 names stay valid known modes", () => {
    const legacy: KnownPermissionMode[] = ["ask", "edit", "full"];
    expect(legacy).toHaveLength(3);
  });
});
