import type { SandboxResult, ProcessSandbox, ProcessSandboxExecuteOptions } from "@vinhnt-sdk/sandbox";
import { SandboxUnavailableError } from "@vinhnt-sdk/sandbox";

class ContainerSandbox implements ProcessSandbox {
  readonly scope = "container" as const;

  async execute(_options: ProcessSandboxExecuteOptions): Promise<SandboxResult<{ stdout: string; stderr: string; exitCode: number }>> {
    // Fail-closed: no real container runtime adapter is wired yet. Never
    // silently downgrade to host/process isolation.
    throw new SandboxUnavailableError("container");
  }

  async destroy(): Promise<void> {
    // Nothing allocated
  }
}

/**
 * Create a container sandbox backend.
 *
 * Fail-closed: `execute()` always throws `SandboxUnavailableError` until a real
 * container runtime adapter is implemented. There is no silent downgrade.
 */
export function createContainerSandbox(): ProcessSandbox {
  return new ContainerSandbox();
}