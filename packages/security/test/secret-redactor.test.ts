import { describe, expect, it } from "vitest";
import { redactSecrets, detectSecrets, SecretRedactor } from "../src/secret-redactor.js";

describe("redactSecrets", () => {
  it("redacts full-length provider keys with their specific label", () => {
    const out = redactSecrets("key=sk-ant-abcdefghijklmnopqrstuvwxyz1234567890");
    expect(out).toBe("key=[REDACTED:anthropic-key]");
  });

  it("redacts short/masked sk- key-prefix tokens mid-sentence (RV-43)", () => {
    const out = redactSecrets('Incorrect API key provided: sk-abc123. Retry after 5s.');
    expect(out).toBe("Incorrect API key provided: [REDACTED:api-key-prefix]. Retry after 5s.");
  });

  it("redacts a short sk-proj- prefix token because default patterns never echo it", () => {
    const out = redactSecrets('Invalid key: sk-proj-xy12zab3');
    expect(out).not.toContain("sk-proj-xy12zab3");
    expect(out).toContain("[REDACTED:");
  });

  it("redacts short keys even when embedded in an error body string", () => {
    const out = redactSecrets(JSON.stringify({ error: { message: "Bad key sk-short123" } }));
    expect(out).not.toContain("sk-short123");
    expect(out).toContain("[REDACTED:");
  });

  it("does not double-redact an already redacted message", () => {
    const text = "key=sk-ant-abcdefghijklmnopqrstuvwxyz1234567890";
    const once = redactSecrets(text);
    expect(redactSecrets(once)).toBe(once);
  });

  it("leaves ordinary text untouched", () => {
    expect(redactSecrets("working directory is D:\\template\\opencode_vntagent")).toBe(
      "working directory is D:\\template\\opencode_vntagent",
    );
  });
});

describe("detectSecrets", () => {
  it("detects both long and short key shapes", () => {
    expect(detectSecrets("sk-ant-abcdefghijklmnopqrstuvwxyz1234567890")).toContain("anthropic-key");
    expect(detectSecrets("Incorrect API key provided: sk-abc123.")).toContain("api-key-prefix");
  });
});

describe("SecretRedactor", () => {
  it("registers an extra pattern", () => {
    const r = new SecretRedactor();
    r.register({ name: "custom", pattern: /CUSTOM-[A-Z0-9]+/g, replacement: "[REDACTED:custom]" });
    expect(r.redact("CUSTOM-ABC123")).toBe("[REDACTED:custom]");
  });

  it("unregisters a pattern by name", () => {
    const r = new SecretRedactor();
    r.unregister("api-key-prefix");
    expect(r.redact("Incorrect API key provided: sk-abc123.")).toBe(
      "Incorrect API key provided: sk-abc123.",
    );
  });
});