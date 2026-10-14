export type { SandboxScope, SandboxConfig, SandboxResult, ProcessSandbox, ProcessSandboxExecuteOptions } from "./types.js";
export { KNOWN_SANDBOX_SCOPES } from "./types.js";
export { SandboxUnavailableError } from "./error.js";
export { createSandbox } from "./factory.js";
export type { SandboxBackendFactory, SandboxBackends } from "./factory.js";
export { parseCommand } from "./shell-parser.js";
export { killProcessTree, killProcessTreeAndWait, isPidAlive, pruneKillTreeState, treeKillSpawnOptions } from "./kill-tree.js";
export { withTimeoutAndAbort } from "./timeout.js";

// Re-export backend factories for backward compatibility
// These were previously in separate packages (sandbox-host, sandbox-process)
export { createHostSandbox } from "./backends/host.js";
export { createProcessSandbox } from "./backends/process.js";
export { createContainerSandbox, DEFAULT_CONTAINER_IMAGE, CONTAINER_WORKSPACE } from "./backends/container.js";
export type { ContainerRunSpec } from "./backends/container.js";