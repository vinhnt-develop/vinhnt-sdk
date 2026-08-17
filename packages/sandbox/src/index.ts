export type { SandboxScope, SandboxConfig, SandboxResult, ProcessSandbox, ProcessSandboxExecuteOptions } from "./types.js";
export { KNOWN_SANDBOX_SCOPES } from "./types.js";
export { SandboxUnavailableError } from "./error.js";
export { createSandbox } from "./factory.js";
export type { SandboxBackendFactory, SandboxBackends } from "./factory.js";
export { parseCommand } from "./shell-parser.js";
export { killProcessTree, isPidAlive, resetKillTreeState, treeKillSpawnOptions } from "./kill-tree.js";