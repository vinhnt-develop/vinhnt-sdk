import { execFile } from "node:child_process";
import type { SandboxConfig, SandboxResult, ProcessSandbox, ProcessSandboxExecuteOptions } from "../types.js";
import { treeKillSpawnOptions } from "../kill-tree.js";
import { withTimeoutAndAbort } from "../timeout.js";

/**
 * Default container image for the `container` scope (G17).
 * Override per config via `metadata.containerImage`.
 */
export const DEFAULT_CONTAINER_IMAGE = "alpine:3.20";

/** Container workspace mount point (host cwd is bind-mounted here). */
export const CONTAINER_WORKSPACE = "/workspace";

/** Spec for one `docker run` invocation — pure data, built by the backend. */
export interface ContainerRunSpec {
  /** Shell command executed as `sh -c <command>` inside the container. */
  readonly command: string;
  /** Host path bind-mounted read-write at {@link CONTAINER_WORKSPACE}. */
  readonly hostCwd: string;
  /** Unique container name (used for kill/cleanup on timeout/abort). */
  readonly containerName: string;
  readonly image: string;
  /** false -> `--network none` (deny-all egress); true -> Docker default bridge. */
  readonly allowNetwork: boolean;
  /** Environment variables forwarded into the container (already filtered). */
  readonly env: Readonly<Record<string, string>>;
  /** Optional egress allowlist proxy — sets HTTP_PROXY/HTTPS_PROXY inside the container. */
  readonly proxyUrl?: string | undefined;
}

/**
 * Build the argv for `docker run --rm ... image sh -c <command>` (pure, unit-testable).
 *
 * Egress policy:
 * - `allowNetwork: false` → `--network none` (no egress at all).
 * - `allowNetwork: true` + `metadata.egressProxyUrl` → container traffic is
 *   forced through the caller's allowlisting proxy (SDK injects proxy env;
 *   the proxy enforces the per-host allowlist — no fake enforcement here).
 */
export function buildContainerRunArgs(spec: ContainerRunSpec): string[] {
  const hostPath = spec.hostCwd.replace(/\\/g, "/");
  const args: string[] = ["run", "--rm", "--name", spec.containerName];
  if (!spec.allowNetwork) args.push("--network", "none");
  args.push("-v", `${hostPath}:${CONTAINER_WORKSPACE}`, "-w", CONTAINER_WORKSPACE);
  for (const [key, value] of Object.entries(spec.env)) {
    args.push("-e", `${key}=${value}`);
  }
  if (spec.proxyUrl) {
    args.push("-e", `HTTP_PROXY=${spec.proxyUrl}`, "-e", `HTTPS_PROXY=${spec.proxyUrl}`);
  }
  args.push(spec.image, "sh", "-c", spec.command);
  return args;
}

/**
 * Filter the host environment down to `allowedEnvVars` (mirrors the process
 * backend: no allowlist = empty env — the container image provides its own).
 */
export function filterContainerEnv(config: SandboxConfig): Record<string, string> {
  const env: Record<string, string> = {};
  if (!config.allowedEnvVars) return env;
  for (const key of config.allowedEnvVars) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  return env;
}

function metadataString(config: SandboxConfig, key: string): string | undefined {
  const value = config.metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Resolved container settings (defaults + `SandboxConfig.metadata` overrides). */
export interface ContainerSettings {
  readonly dockerBinary: string;
  readonly image: string;
  readonly proxyUrl: string | undefined;
  readonly allowNetwork: boolean;
}

/**
 * Resolve container settings from `SandboxConfig`: `metadata.dockerBinary`,
 * `metadata.containerImage`, `metadata.egressProxyUrl`, `allowNetwork`.
 * Pure — unit-tested without Docker.
 */
export function resolveContainerSettings(config: SandboxConfig): ContainerSettings {
  return {
    dockerBinary: metadataString(config, "dockerBinary") ?? "docker",
    image: metadataString(config, "containerImage") ?? DEFAULT_CONTAINER_IMAGE,
    proxyUrl: metadataString(config, "egressProxyUrl"),
    allowNetwork: config.allowNetwork !== false,
  };
}

class ContainerSandboxImpl implements ProcessSandbox {
  readonly scope = "container" as const;
  private readonly config: SandboxConfig;
  private readonly settings: ContainerSettings;
  private readonly active = new Set<string>();

  constructor(config: SandboxConfig) {
    this.config = config;
    this.settings = resolveContainerSettings(config);
  }

  async execute(options: ProcessSandboxExecuteOptions): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number }>> {
    const start = Date.now();
    const containerName = `vnt-sbx-${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const args = buildContainerRunArgs({
      command: options.command,
      hostCwd: options.cwd,
      containerName,
      image: this.settings.image,
      allowNetwork: this.settings.allowNetwork,
      env: filterContainerEnv(this.config),
      proxyUrl: this.settings.proxyUrl,
    });

    return new Promise((resolve) => {
      this.active.add(containerName);
      const child = execFile(
        this.settings.dockerBinary,
        args,
        {
          cwd: options.cwd,
          maxBuffer: 10 * 1024 * 1024,
          encoding: "utf-8" as const,
          windowsHide: true,
          ...treeKillSpawnOptions(),
        },
        (err, stdout, stderr) => {
          this.active.delete(containerName);
          const durationMs = Date.now() - start;
          if (err) {
            // Fail closed: a missing docker CLI never downgrades to host/process.
            const unavailable = err.code === "ENOENT";
            const exitCode = unavailable ? 127 : typeof err.code === "number" ? err.code : 1;
            const errStderr = unavailable
              ? `container sandbox unavailable: docker CLI "${this.settings.dockerBinary}" not found — install Docker or use scope "process"/"host"`
              : String(stderr ?? "");
            resolve({
              result: { stdout: String(stdout ?? ""), stderr: errStderr, exitCode },
              exitCode,
              durationMs,
              timedOut: handle.timedOut,
            });
          } else {
            resolve({
              result: { stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), exitCode: 0 },
              exitCode: 0,
              durationMs,
              timedOut: false,
            });
          }
        },
      );

      const handle = withTimeoutAndAbort(child, options.timeoutMs, options.signal, (reason) => {
        // Killing the docker CLI orphans the container — stop it explicitly.
        this.killContainer(containerName);
        resolve({
          result: { stdout: "", stderr: reason, exitCode: 1 },
          exitCode: 1,
          durationMs: Date.now() - start,
          timedOut: handle.timedOut,
        });
      });
    });
  }

  /** Best-effort kill of a container by name (timeout/abort/destroy cleanup). */
  private killContainer(name: string): void {
    execFile(
      this.settings.dockerBinary,
      ["kill", name],
      { windowsHide: true, timeout: 5_000, encoding: "utf-8" as const },
      () => { /* best-effort: container may already be gone (--rm) */ },
    );
  }

  async destroy(): Promise<void> {
    const names = [...this.active];
    this.active.clear();
    await Promise.all(
      names.map(
        (name) =>
          new Promise<void>((resolve) => {
            execFile(
              this.settings.dockerBinary,
              ["kill", name],
              { windowsHide: true, timeout: 5_000, encoding: "utf-8" as const },
              () => resolve(),
            );
          }),
      ),
    );
  }
}

/**
 * Create the Docker container isolation backend (G17).
 *
 * - Workspace isolation: host cwd bind-mounted at `/workspace` (nothing else).
 * - Egress: `allowNetwork: false` → `--network none`; optional
 *   `metadata.egressProxyUrl` forces traffic through an allowlisting proxy.
 * - Timeout/abort kills the docker CLI **and** the container by name.
 * - Missing docker CLI fails closed (exit 127 + clear stderr) — never downgrades.
 *
 * Config extras (via `SandboxConfig.metadata`): `containerImage`,
 * `dockerBinary`, `egressProxyUrl`.
 */
export function createContainerSandbox(config: SandboxConfig): ProcessSandbox {
  return new ContainerSandboxImpl(config);
}
