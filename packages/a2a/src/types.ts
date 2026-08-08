/**
 * A2A (Agent-to-Agent) Protocol Types
 *
 * Based on the Agent-to-Agent protocol specification.
 * Provides agent discovery, communication, and task delegation.
 */

/** Agent capability declaration. */
export interface AgentCapability {
  /** Capability identifier (e.g. "code-generation", "review", "testing"). */
  readonly id: string;
  /** Human-readable description. */
  readonly description: string;
  /** Supported input MIME types. */
  readonly inputTypes?: readonly string[];
  /** Supported output MIME types. */
  readonly outputTypes?: readonly string[];
}

/** Agent Card — describes an agent for discovery. */
export interface AgentCard {
  /** Unique agent identifier. */
  readonly id: string;
  /** Human-readable agent name. */
  readonly name: string;
  /** Agent description. */
  readonly description: string;
  /** Agent version. */
  readonly version: string;
  /** Agent capabilities. */
  readonly capabilities: readonly AgentCapability[];
  /** Endpoint URL for communicating with this agent. */
  readonly endpoint: string;
  /** Supported authentication methods. */
  readonly auth?: readonly string[];
  /** Agent metadata (custom key-value pairs). */
  readonly metadata?: Record<string, unknown>;
}

/** A2A task status. */
export type A2ATaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

/** A2A task request. */
export interface A2ATaskRequest {
  /** Task ID (generated if not provided). */
  readonly taskId?: string;
  /** ID of the agent to delegate to. */
  readonly agentId: string;
  /** Task message/prompt. */
  readonly message: string;
  /** Optional context from previous tasks. */
  readonly context?: Record<string, unknown>;
  /** Timeout in ms. */
  readonly timeoutMs?: number;
}

/** A2A task response. */
export interface A2ATaskResponse {
  /** Task ID. */
  readonly taskId: string;
  /** Task status. */
  readonly status: A2ATaskStatus;
  /** Task result (if completed). */
  readonly result?: string;
  /** Error message (if failed). */
  readonly error?: string;
  /** Token usage. */
  readonly usage?: { inputTokens: number; outputTokens: number };
}

/** A2A task update event. */
export interface A2ATaskUpdate {
  /** Task ID. */
  readonly taskId: string;
  /** New status. */
  readonly status: A2ATaskStatus;
  /** Progress message. */
  readonly message?: string;
  /** Timestamp. */
  readonly timestamp: string;
}

/** A2A client configuration. */
export interface A2AClientConfig {
  /** Agent Card for the remote agent. */
  readonly agentCard: AgentCard;
  /** Request timeout in ms. Default: 30000. */
  readonly timeoutMs?: number;
  /** Custom headers for HTTP requests. */
  readonly headers?: Record<string, string>;
}

/** A2A server configuration. */
export interface A2AServerConfig {
  /** This agent's card. */
  readonly agentCard: AgentCard;
  /** Port to listen on. Default: 3000. */
  readonly port?: number;
  /** Host to bind to. Default: "0.0.0.0". */
  readonly host?: string;
  /** Handler for incoming task requests. */
  readonly taskHandler: (request: A2ATaskRequest) => Promise<A2ATaskResponse>;
}
