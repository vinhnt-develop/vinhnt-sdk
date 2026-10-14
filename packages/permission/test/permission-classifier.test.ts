import { describe, expect, it, vi } from "vitest";
import { createCallbackPermissionClassifier, createRiskPermissionClassifier } from "../src/index.js";

describe("createRiskPermissionClassifier (G5 default `auto` classifier)", () => {
  const classifier = createRiskPermissionClassifier();

  it("auto-allows reads and writes", async () => {
    await expect(classifier.classify({ toolName: "read_file", risk: "read" })).resolves.toBe("allow");
    await expect(classifier.classify({ toolName: "write_file", risk: "write" })).resolves.toBe("allow");
  });

  it("prompts for network and destructive operations", async () => {
    await expect(classifier.classify({ toolName: "fetch_url", risk: "external" })).resolves.toBe("ask");
    await expect(classifier.classify({ toolName: "execute_command", risk: "destructive" })).resolves.toBe("ask");
  });

  it("fails closed for missing or unknown risk", async () => {
    await expect(classifier.classify({ toolName: "mystery" })).resolves.toBe("ask");
    await expect(classifier.classify({ toolName: "mystery", risk: "chaotic" })).resolves.toBe("ask");
  });
});

describe("createCallbackPermissionClassifier (G5 LLM seam)", () => {
  it("delegates and forwards the full input", async () => {
    const classify = vi.fn(async () => "allow" as const);
    const classifier = createCallbackPermissionClassifier(classify);
    const input = { toolName: "shell", risk: "destructive", args: { command: "ls" }, source: "risk" as const };
    await expect(classifier.classify(input)).resolves.toBe("allow");
    expect(classify).toHaveBeenCalledWith(input);
  });
});
