import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/crypto/password.js";

describe("hashPassword", () => {
  it("returns salt:hash format", async () => {
    const result = await hashPassword("hello");
    expect(result).toMatch(/^[0-9a-f]{64}:[0-9a-f]{128}$/);
  });

  it("produces different hashes for same input (random salt)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });

  it("produces different hashes for different inputs", async () => {
    const a = await hashPassword("password1");
    const b = await hashPassword("password2");
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const stored = await hashPassword("correct");
    expect(await verifyPassword("correct", stored)).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const stored = await hashPassword("correct");
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("returns false for malformed stored string", async () => {
    expect(await verifyPassword("test", "no-colon")).toBe(false);
  });

  it("returns false for empty password against non-empty hash", async () => {
    const stored = await hashPassword("something");
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("works with unicode passwords", async () => {
    const pw = "pässwörd_日本語_🔐";
    const stored = await hashPassword(pw);
    expect(await verifyPassword(pw, stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("works with very long passwords", async () => {
    const pw = "a".repeat(10_000);
    const stored = await hashPassword(pw);
    expect(await verifyPassword(pw, stored)).toBe(true);
  });
});
