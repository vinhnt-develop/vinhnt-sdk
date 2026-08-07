import { readFile, access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface McpStdioServerConfig {
  command: string;
  args?: readonly string[];
  env?: Record<string, string>;
  /** Per-server permission default: allow | deny | ask (applied to every tool of this server). */
  permission?: "allow" | "deny" | "ask";
}

export interface McpHttpServerConfig {
  url: string;
  headers?: Record<string, string>;
  /** Per-server permission default: allow | deny | ask (applied to every tool of this server). */
  permission?: "allow" | "deny" | "ask";
  auth?: {
    type: "oauth" | "bearer";
    clientId?: string;
    clientSecret?: string;
    /** Bearer token or pre-obtained access token */
    token?: string;
    /** OAuth: authorization URL */
    authorizationUrl?: string;
    /** OAuth: token exchange URL */
    tokenUrl?: string;
    /** OAuth: localhost port for callback (default 31415) */
    redirectPort?: number;
    /** OAuth: cached access token (auto-populated after flow) */
    accessToken?: string;
    /** OAuth: cached refresh token */
    refreshToken?: string;
  };
}

export type McpServerConfigItem = McpStdioServerConfig | McpHttpServerConfig;

export interface McpConfigFile {
  $schema?: string;
  servers: Record<string, McpServerConfigItem>;
}

export async function loadMcpConfig(cwd: string): Promise<McpConfigFile> {
  const candidates = [
    join(cwd, ".mcp.json"),
    join(cwd, "mcp.json"),
    join(homedir(), ".mcp.json"),
  ];

  for (const filePath of candidates) {
    try {
      await access(filePath);
      const raw = await readFile(filePath, "utf-8");
      const config = JSON.parse(raw) as McpConfigFile;
      if (config.servers && typeof config.servers === "object") {
        return config;
      }
    } catch {
      continue;
    }
  }

  return { servers: {} };
}

export function isStdioConfig(config: McpServerConfigItem): config is McpStdioServerConfig {
  return "command" in config && typeof config.command === "string";
}

export function isHttpConfig(config: McpServerConfigItem): config is McpHttpServerConfig {
  return "url" in config && typeof config.url === "string";
}
