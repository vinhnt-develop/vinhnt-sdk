/**
 * Shared default constants for vinhnt-sdk/ui package.
 * User tự override qua config, không bắt buộc dùng defaults này.
 */

/**
 * Default ACP WebSocket URL — convenience only.
 * User inject: `new AcpClient({ url: userConfig.acpUrl })`
 */
export const DEFAULT_ACP_URL = "ws://localhost:3101/acp";

/**
 * Default ACP client name for UI — convenience only.
 * User inject: `new AcpClient({ clientName: "my-app" })`
 */
export const DEFAULT_ACP_CLIENT_NAME = "vnt-agent-ui";

/**
 * Default ACP request timeout (ms) — convenience only.
 */
export const DEFAULT_ACP_TIMEOUT = 30000;

/**
 * Default max reconnect attempts — convenience only.
 */
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Default shell options — convenience only.
 * User tự extend: `[...DEFAULT_SHELL_OPTIONS, { value: "nushell", label: "Nushell" }]`
 */
export const DEFAULT_SHELL_OPTIONS: { value: string; label: string }[] = [
  { value: "bash", label: "Bash" },
  { value: "zsh", label: "Zsh" },
  { value: "pwsh", label: "PowerShell Core" },
  { value: "powershell", label: "Windows PowerShell" },
];

/**
 * Default agent modes — convenience only.
 * User tự extend: `[...DEFAULT_AGENT_MODES, { value: "custom", label: "Custom Mode" }]`
 */
export const DEFAULT_AGENT_MODES: { value: string; label: string }[] = [
  { value: "build", label: "Build (full access)" },
  { value: "plan", label: "Plan (read-only)" },
];

/**
 * Default log levels — convenience only.
 */
export const DEFAULT_LOG_LEVELS: { value: string; label: string }[] = [
  { value: "debug", label: "Debug" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warning" },
  { value: "error", label: "Error" },
];

/**
 * Default theme modes — convenience only.
 */
export const DEFAULT_THEME_MODES: { value: string; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "auto", label: "Auto (follow system)" },
];
