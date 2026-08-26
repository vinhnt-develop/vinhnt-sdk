import { describe, expect, it } from "vitest";
import { sanitizeEnv } from "../src/env-sanitizer.js";

describe("sanitizeEnv (P1-G)", () => {
  it("keeps whitelisted variables (PATH, TMP, LANG)", () => {
    const result = sanitizeEnv({
      PATH: "/usr/bin:/bin",
      TMP: "/tmp",
      LANG: "en_US.UTF-8",
      HOME: "/root",
      USERNAME: "admin",
    });
    expect(result.PATH).toBe("/usr/bin:/bin");
    expect(result.TMP).toBe("/tmp");
    expect(result.LANG).toBe("en_US.UTF-8");
  });

  it("strips secrets: AWS/GH/GitLab/TOKEN/DATABASE_URL/npm_*", () => {
    const result = sanitizeEnv({
      AWS_ACCESS_KEY_ID: "AKIA...",
      AWS_SECRET_ACCESS_KEY: "secret",
      GITHUB_TOKEN: "ghp_xxx",
      GITLAB_TOKEN: "glpat-xxx",
      DATABASE_URL: "postgres://user:pass@host/db",
      API_KEY: "key123",
      NPM_TOKEN: "npm_xxx",
      NODE_ENV: "production",
      PATH: "/bin",
    });
    expect(result.AWS_ACCESS_KEY_ID).toBeUndefined();
    expect(result.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(result.GITHUB_TOKEN).toBeUndefined();
    expect(result.GITLAB_TOKEN).toBeUndefined();
    expect(result.DATABASE_URL).toBeUndefined();
    expect(result.API_KEY).toBeUndefined();
    expect(result.NPM_TOKEN).toBeUndefined();
    expect(result.NODE_ENV).toBeUndefined();
    expect(result.PATH).toBe("/bin");
  });

  it("honours explicit allowedVars on top of the whitelist", () => {
    const result = sanitizeEnv(
      { MY_CUSTOM_VAR: "hello", PATH: "/bin", AWS_TOKEN: "x" },
      ["MY_CUSTOM_VAR"],
    );
    expect(result.MY_CUSTOM_VAR).toBe("hello");
    expect(result.PATH).toBe("/bin");
    expect(result.AWS_TOKEN).toBeUndefined();
  });

  it("does not leak secrets through case variations", () => {
    const result = sanitizeEnv({
      database_url: "postgres://x",
      "Github_Token": "ghp",
      path: "/bin",
    });
    expect(result.database_url).toBeUndefined();
    expect(result.Github_Token).toBeUndefined();
    expect(result.path).toBe("/bin");
  });
});