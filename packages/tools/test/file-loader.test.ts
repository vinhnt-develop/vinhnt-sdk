import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { ToolFileLoader } from "../src/providers/file-loader.js";

let dir: string;
let outside: string;

const VALID_TOOL = `export default {
  id: "hello_tool",
  description: "says hello",
  risk: "low",
  execute: async () => ({ ok: true, greeting: "hello" }),
};
`;

const OTHER_TOOL = `export default {
  id: "other_tool",
  description: "other",
  risk: "low",
  execute: async () => ({ ok: true }),
};
`;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "vnt-file-loader-"));
  // .js under a dir with type:module is deterministic ESM for dynamic import.
  await writeFile(join(dir, "package.json"), JSON.stringify({ type: "module" }));
  outside = await mkdtemp(join(tmpdir(), "vnt-file-loader-outside-"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

describe("ToolFileLoader", () => {
  it("loads a valid ESM tool from the directory", async () => {
    await writeFile(join(dir, "hello.js"), VALID_TOOL);
    const tools = await new ToolFileLoader().loadFromDirectory(dir);
    expect(tools.map((t) => t.id)).toContain("hello_tool");
  });

  it("skips non-.ts/.js files", async () => {
    await writeFile(join(dir, "notes.txt"), "not a tool");
    const tools = await new ToolFileLoader().loadFromDirectory(dir);
    expect(tools.some((t) => t.id === "notes_tool")).toBe(false);
  });

  it("skips symlinked files even if they look like tools (RV-48)", async () => {
    await writeFile(join(outside, "evil.js"), VALID_TOOL);
    await symlink(join(outside, "evil.js"), join(dir, "evil.js"), "file");
    const tools = await new ToolFileLoader().loadFromDirectory(dir);
    // evil.js carries the same id as hello.js — only the real file may load.
    expect(tools.filter((t) => t.id === "hello_tool")).toHaveLength(1);
  });

  it("enforces a SHA-256 hash pin — mismatch files are skipped (RV-48)", async () => {
    await writeFile(join(dir, "other.js"), OTHER_TOOL);
    const content = await (await import("node:fs/promises")).readFile(join(dir, "other.js"));
    const goodHash = createHash("sha256").update(content).digest("hex");

    const loader = new ToolFileLoader();
    const withGoodHash = await loader.loadFromDirectory(dir, { "other.js": goodHash });
    expect(withGoodHash.map((t) => t.id)).toContain("other_tool");

    const withBadHash = await loader.loadFromDirectory(dir, { "other.js": "deadbeef" });
    expect(withBadHash.map((t) => t.id)).not.toContain("other_tool");
  });
});
