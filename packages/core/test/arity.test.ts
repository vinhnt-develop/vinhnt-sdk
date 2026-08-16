import { describe, it, expect } from "vitest";
import { prefix, commandPattern } from "@vinhnt-sdk/tools";

describe("prefix", () => {
  it("returns single token for simple commands", () => {
    expect(prefix(["cat", "file.txt"])).toEqual(["cat"]);
    expect(prefix(["ls", "-la"])).toEqual(["ls"]);
    expect(prefix(["rm", "-rf", "dir"])).toEqual(["rm"]);
  });

  it("returns two tokens for npm/git/docker", () => {
    expect(prefix(["npm", "install", "express", "--save"])).toEqual(["npm", "install"]);
    expect(prefix(["npm", "run", "dev"])).toEqual(["npm", "run", "dev"]);
    expect(prefix(["git", "checkout", "main"])).toEqual(["git", "checkout"]);
    expect(prefix(["git", "commit", "-m", "fix"])).toEqual(["git", "commit"]);
    expect(prefix(["docker", "run", "nginx"])).toEqual(["docker", "run"]);
  });

  it("returns three tokens for docker compose/aws subcommands", () => {
    expect(prefix(["docker", "compose", "up", "-d"])).toEqual(["docker", "compose", "up"]);
    expect(prefix(["aws", "s3", "ls"])).toEqual(["aws", "s3", "ls"]);
    expect(prefix(["gh", "pr", "list"])).toEqual(["gh", "pr", "list"]);
  });

  it("returns three tokens for npm run/pnpm exec", () => {
    expect(prefix(["npm", "run", "dev", "--port", "3000"])).toEqual(["npm", "run", "dev"]);
    expect(prefix(["pnpm", "exec", "vite"])).toEqual(["pnpm", "exec", "vite"]);
    expect(prefix(["yarn", "dlx", "create-react-app"])).toEqual(["yarn", "dlx", "create-react-app"]);
  });

  it("returns the longest matching prefix", () => {
    // "npm run" has arity 3, "npm" has arity 2 — longer prefix wins
    expect(prefix(["npm", "run", "dev"])).toEqual(["npm", "run", "dev"]);
    // "docker compose" has arity 3, "docker" has arity 2
    expect(prefix(["docker", "compose", "up"])).toEqual(["docker", "compose", "up"]);
  });

  it("returns first token for unknown commands", () => {
    expect(prefix(["unknowncmd", "arg1", "arg2"])).toEqual(["unknowncmd"]);
    expect(prefix(["zzz_not_a_command", "arg1"])).toEqual(["zzz_not_a_command"]);
  });

  it("returns empty array for empty input", () => {
    expect(prefix([])).toEqual([]);
  });

  it("handles shell with only a command", () => {
    expect(prefix(["ls"])).toEqual(["ls"]);
    expect(prefix(["npm"])).toEqual(["npm"]);
  });
});

describe("commandPattern", () => {
  it("adds trailing * wildcard", () => {
    expect(commandPattern("npm install express")).toBe("npm install *");
    expect(commandPattern("git checkout main")).toBe("git checkout *");
  });

  it("uses arity prefix for known commands", () => {
    expect(commandPattern("npm install express --save")).toBe("npm install *");
    expect(commandPattern("docker compose up -d")).toBe("docker compose up *");
    expect(commandPattern("gh pr list --state open")).toBe("gh pr list *");
  });

  it("uses first token for unknown commands", () => {
    expect(commandPattern("unknowncmd arg1 arg2")).toBe("unknowncmd *");
  });

  it("handles empty string", () => {
    expect(commandPattern("")).toBe("*");
    expect(commandPattern("   ")).toBe("*");
  });

  it("handles simple single commands", () => {
    expect(commandPattern("cat file.txt")).toBe("cat *");
    expect(commandPattern("ls -la")).toBe("ls *");
  });
});
