import { describe, it, expect } from "vitest";
import { hashArgs, detectDoomLoop, type RecentCall } from "../src/kernel/kernel-utils.js";

describe("hashArgs", () => {
  it("produces identical hashes for key-order-different objects", () => {
    expect(hashArgs({ a: 1, b: 2 })).toBe(hashArgs({ b: 2, a: 1 }));
  });

  it("produces identical hashes for nested objects with different key order", () => {
    const a = { filePath: "/x.txt", options: { encoding: "utf-8", flag: "r" } };
    const b = { options: { flag: "r", encoding: "utf-8" }, filePath: "/x.txt" };
    expect(hashArgs(a)).toBe(hashArgs(b));
  });

  it("produces different hashes for different values", () => {
    expect(hashArgs({ a: 1 })).not.toBe(hashArgs({ a: 2 }));
    expect(hashArgs("hello")).not.toBe(hashArgs("world"));
  });

  it("handles primitives, arrays, null and empty objects", () => {
    expect(hashArgs("text")).toBe(hashArgs("text"));
    expect(hashArgs([1, 2, 3])).toBe(hashArgs([1, 2, 3]));
    expect(hashArgs(null)).toBe(hashArgs(null));
    expect(hashArgs({})).toBe(hashArgs({}));
  });

  it("is deterministic across calls", () => {
    const v = { path: "/a/b", deep: { list: [1, 2], ok: true } };
    expect(hashArgs(v)).toBe(hashArgs(v));
  });
});

describe("detectDoomLoop", () => {
  it("returns false when fewer calls than threshold", () => {
    const calls: RecentCall[] = [
      { id: "read_file", args: { filePath: "/x" } },
    ];
    expect(detectDoomLoop(calls, "read_file", { filePath: "/x" }, 3)).toBe(false);
  });

  it("detects threshold identical calls with same tool and args", () => {
    const calls: RecentCall[] = [
      { id: "read_file", args: { filePath: "/x" } },
      { id: "read_file", args: { filePath: "/x" } },
      { id: "read_file", args: { filePath: "/x" } },
    ];
    expect(detectDoomLoop(calls, "read_file", { filePath: "/x" })).toBe(true);
  });

  it("detects doom with precomputed argsKey (key-order insensitive)", () => {
    const calls: RecentCall[] = [
      { id: "edit_file", args: { filePath: "/x" }, argsKey: hashArgs({ filePath: "/x" }) },
      { id: "edit_file", args: { filePath: "/x" }, argsKey: hashArgs({ filePath: "/x" }) },
      { id: "edit_file", args: { filePath: "/x" }, argsKey: hashArgs({ filePath: "/x" }) },
    ];
    // Args given in a different key order than the recorded ones
    expect(detectDoomLoop(calls, "edit_file", { filePath: "/x" }, 3)).toBe(true);
  });

  it("does not detect doom when different tools", () => {
    const calls: RecentCall[] = [
      { id: "read_file", args: { filePath: "/x" } },
      { id: "read_file", args: { filePath: "/x" } },
      { id: "write_file", args: { filePath: "/x" } },
    ];
    expect(detectDoomLoop(calls, "read_file", { filePath: "/x" }, 3)).toBe(false);
  });

  it("does not detect doom when args differ", () => {
    const calls: RecentCall[] = [
      { id: "read_file", args: { filePath: "/x" } },
      { id: "read_file", args: { filePath: "/x" } },
      { id: "read_file", args: { filePath: "/y" } },
    ];
    expect(detectDoomLoop(calls, "read_file", { filePath: "/x" }, 3)).toBe(false);
  });

  it("only considers the last threshold calls", () => {
    const calls: RecentCall[] = [
      { id: "read_file", args: { filePath: "/a" } },
      { id: "read_file", args: { filePath: "/x" } },
      { id: "read_file", args: { filePath: "/x" } },
      { id: "read_file", args: { filePath: "/x" } },
    ];
    expect(detectDoomLoop(calls, "read_file", { filePath: "/x" }, 3)).toBe(true);
  });

  it("honors a custom threshold", () => {
    const calls: RecentCall[] = [
      { id: "read_file", args: { filePath: "/x" } },
      { id: "read_file", args: { filePath: "/x" } },
      { id: "read_file", args: { filePath: "/x" } },
      { id: "read_file", args: { filePath: "/x" } },
    ];
    expect(detectDoomLoop(calls, "read_file", { filePath: "/x" }, 5)).toBe(false);
    expect(detectDoomLoop(calls, "read_file", { filePath: "/x" }, 4)).toBe(true);
  });
});
