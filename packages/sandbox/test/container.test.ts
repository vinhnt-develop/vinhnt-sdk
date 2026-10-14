import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildContainerRunArgs,
  createContainerSandbox,
  resolveContainerSettings,
  filterContainerEnv,
  DEFAULT_CONTAINER_IMAGE,
  CONTAINER_WORKSPACE,
} from "../src/backends/container.js";
import type { ContainerRunSpec } from "../src/backends/container.js";
import type { SandboxConfig } from "../src/types.js";

/** Gated: real Docker integration only runs when a daemon is reachable. */
const dockerUp = (() => {
  try {
    execFileSync("docker", ["info"], { timeout: 5_000, stdio: "ignore", windowsHide: true });
    return true;
  } catch {
    return false;
  }
})();

const workDir = mkdtempSync(join(tmpdir(), "vnt-container-test-"));

afterAll(() => {
  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

function baseSpec(overrides: Partial<ContainerRunSpec> = {}): ContainerRunSpec {
  return {
    command: "echo hi",
    hostCwd: "/workspace-host",
    containerName: "vnt-sbx-test",
    image: DEFAULT_CONTAINER_IMAGE,
    allowNetwork: true,
    env: {},
    ...overrides,
  };
}

describe("container sandbox — pure arg builder", () => {
  it("TC01_basic_run_args", () => {
    const args = buildContainerRunArgs(baseSpec());
    expect(args.slice(0, 4)).toEqual(["run", "--rm", "--name", "vnt-sbx-test"]);
    expect(args).not.toContain("--network");
    expect(args[args.indexOf("-v") + 1]).toBe(`/workspace-host:${CONTAINER_WORKSPACE}`);
    expect(args[args.indexOf("-w") + 1]).toBe(CONTAINER_WORKSPACE);
    expect(args.slice(-4)).toEqual([DEFAULT_CONTAINER_IMAGE, "sh", "-c", "echo hi"]);
  });

  it("TC02_network_none_when_disallowed", () => {
    const args = buildContainerRunArgs(baseSpec({ allowNetwork: false }));
    const idx = args.indexOf("--network");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(args[idx + 1]).toBe("none");
  });

  it("TC03_proxy_env_injected", () => {
    const args = buildContainerRunArgs(baseSpec({ proxyUrl: "http://proxy.local:3128" }));
    expect(args).toContain("-e");
    expect(args).toContain("HTTP_PROXY=http://proxy.local:3128");
    expect(args).toContain("HTTPS_PROXY=http://proxy.local:3128");
  });

  it("TC04_env_forwarded", () => {
    const args = buildContainerRunArgs(baseSpec({ env: { FOO: "bar" } }));
    const eIdx = args.indexOf("-e");
    expect(eIdx).toBeGreaterThanOrEqual(0);
    expect(args[eIdx + 1]).toBe("FOO=bar");
    const noEnv = buildContainerRunArgs(baseSpec());
    expect(noEnv).not.toContain("-e");
  });

  it("TC05_windows_path_normalized", () => {
    const args = buildContainerRunArgs(baseSpec({ hostCwd: "C:\\proj\\work" }));
    expect(args[args.indexOf("-v") + 1]).toBe(`C:/proj/work:${CONTAINER_WORKSPACE}`);
  });

  it("TC06_custom_image", () => {
    const args = buildContainerRunArgs(baseSpec({ image: "node:22-alpine" }));
    expect(args[args.length - 4]).toBe("node:22-alpine");
  });
});

describe("container sandbox — settings resolution", () => {
  it("TC07_defaults", () => {
    const settings = resolveContainerSettings({ defaultTimeoutMs: 5_000 });
    expect(settings.dockerBinary).toBe("docker");
    expect(settings.image).toBe(DEFAULT_CONTAINER_IMAGE);
    expect(settings.proxyUrl).toBeUndefined();
    expect(settings.allowNetwork).toBe(true);
  });

  it("TC08_metadata_overrides", () => {
    const settings = resolveContainerSettings({
      defaultTimeoutMs: 5_000,
      allowNetwork: false,
      metadata: {
        containerImage: "my/image:1",
        dockerBinary: "/opt/bin/docker",
        egressProxyUrl: "http://allowlist:8080",
      },
    });
    expect(settings.dockerBinary).toBe("/opt/bin/docker");
    expect(settings.image).toBe("my/image:1");
    expect(settings.proxyUrl).toBe("http://allowlist:8080");
    expect(settings.allowNetwork).toBe(false);
  });

  it("TC09_filter_container_env", () => {
    process.env.VNT_TEST_ALLOWED = "yes";
    try {
      expect(
        filterContainerEnv({ defaultTimeoutMs: 5_000, allowedEnvVars: ["VNT_TEST_ALLOWED", "VNT_TEST_MISSING"] }),
      ).toEqual({ VNT_TEST_ALLOWED: "yes" });
      expect(filterContainerEnv({ defaultTimeoutMs: 5_000 })).toEqual({});
    } finally {
      delete process.env.VNT_TEST_ALLOWED;
    }
  });
});

describe("container sandbox — execute", () => {
  it("TC10_missing_docker_cli_fails_closed", async () => {
    const sandbox = createContainerSandbox({
      defaultTimeoutMs: 5_000,
      metadata: { dockerBinary: "vnt-missing-docker-xyz" },
    });
    const res = await sandbox.execute({ command: "echo hi", cwd: workDir, timeoutMs: 5_000 });
    expect(res.exitCode).toBe(127);
    expect(res.timedOut).toBe(false);
    expect(res.result.stdout).toBe("");
    expect(res.result.stderr).toContain("container sandbox unavailable");
    expect(res.result.stderr).toContain("vnt-missing-docker-xyz");
  });

  it("TC11_destroy_is_idle_safe", async () => {
    const sandbox = createContainerSandbox({ defaultTimeoutMs: 5_000 });
    await expect(sandbox.destroy()).resolves.toBeUndefined();
  });
});

describe.skipIf(!dockerUp)("container sandbox — real docker integration", () => {
  it("TC12_echo_runs_in_container", async () => {
    const sandbox = createContainerSandbox({ defaultTimeoutMs: 30_000 });
    const res = await sandbox.execute({ command: "echo hi", cwd: workDir, timeoutMs: 30_000 });
    expect(res.exitCode).toBe(0);
    expect(res.result.stdout.trim()).toBe("hi");
  });

  it("TC13_timeout_kills_container", async () => {
    const sandbox = createContainerSandbox({ defaultTimeoutMs: 30_000 });
    const res = await sandbox.execute({ command: "sleep 30", cwd: workDir, timeoutMs: 1_500 });
    expect(res.timedOut).toBe(true);
    expect(res.exitCode).toBe(1);
    expect(res.durationMs).toBeLessThan(20_000);
  });

  it("TC14_network_none_blocks_egress", async () => {
    const sandbox = createContainerSandbox({ defaultTimeoutMs: 30_000, allowNetwork: false });
    const res = await sandbox.execute({
      command: "wget -q -T 3 -O - http://example.com >/dev/null 2>&1; echo $?",
      cwd: workDir,
      timeoutMs: 30_000,
    });
    // busybox wget exits non-zero when network is denied (--network none)
    expect(res.exitCode).toBe(0);
    expect(res.result.stdout.trim()).not.toBe("0");
  });
});
