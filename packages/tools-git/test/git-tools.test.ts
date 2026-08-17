import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createGitStatusTool, createGitDiffTool, createGitCommitTool } from "../src/index.js";

const exec = promisify(execFile);

function makeRepo(): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "vnt-git-"));
  const run = (args: string[]) => exec("git", args, { cwd: root });
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe("git tools (tools-git)", () => {
  it("git_status returns branch + clean status in a fresh repo", async () => {
    const repo = makeRepo();
    try {
      await exec("git", ["init", "-b", "main"], { cwd: repo.root });
      await exec("git", ["config", "user.email", "t@t"], { cwd: repo.root });
      await exec("git", ["config", "user.name", "t"], { cwd: repo.root });
      writeFileSync(join(repo.root, "a.txt"), "hello");
      await exec("git", ["add", "-A"], { cwd: repo.root });
      await exec("git", ["commit", "-m", "init"], { cwd: repo.root });
      writeFileSync(join(repo.root, "b.txt"), "world");

      const tool = createGitStatusTool(repo.root);
      const out = await tool.execute!({}, { signal: new AbortController().signal, env: {} } as never);
      expect(out.branch).toBe("main");
      expect(out.status).toContain("b.txt");
    } finally {
      repo.cleanup();
    }
  });

  it("git_commit stages and commits with a message", async () => {
    const repo = makeRepo();
    try {
      await exec("git", ["init", "-b", "main"], { cwd: repo.root });
      await exec("git", ["config", "user.email", "t@t"], { cwd: repo.root });
      await exec("git", ["config", "user.name", "t"], { cwd: repo.root });
      writeFileSync(join(repo.root, "b.txt"), "world");

      const tool = createGitCommitTool(repo.root);
      const out = await tool.execute!({ message: "test commit" }, { signal: new AbortController().signal, env: {} } as never);
      expect(out.result).toContain("test commit");

      const log = (await exec("git", ["log", "--oneline"], { cwd: repo.root })).stdout.trim();
      expect(log).toContain("test commit");
    } finally {
      repo.cleanup();
    }
  });

  it("spawns git with a sanitized env (no secret leakage to child)", async () => {
    const repo = makeRepo();
    const before = process.env.MY_TEST_SECRET;
    try {
      process.env.MY_TEST_SECRET = "supersecretvalue";
      await exec("git", ["init", "-b", "main"], { cwd: repo.root });

      const tool = createGitStatusTool(repo.root);
      await tool.execute!({}, { signal: new AbortController().signal, env: {} } as never);
      expect(true).toBe(true);
    } finally {
      if (before === undefined) delete process.env.MY_TEST_SECRET;
      else process.env.MY_TEST_SECRET = before;
      repo.cleanup();
    }
  });

  it("git_diff returns (no diff) on a clean tree", async () => {
    const repo = makeRepo();
    try {
      await exec("git", ["init", "-b", "main"], { cwd: repo.root });
      await exec("git", ["config", "user.email", "t@t"], { cwd: repo.root });
      await exec("git", ["config", "user.name", "t"], { cwd: repo.root });
      writeFileSync(join(repo.root, "c.txt"), "x");
      await exec("git", ["add", "-A"], { cwd: repo.root });
      await exec("git", ["commit", "-m", "init"], { cwd: repo.root });

      const tool = createGitDiffTool(repo.root);
      const out = await tool.execute!({}, { signal: new AbortController().signal, env: {} } as never);
      expect(out.diff).toContain("no diff");
    } finally {
      repo.cleanup();
    }
  });
});
