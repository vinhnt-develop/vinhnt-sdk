/**
 * A2A v1.0 (Linux Foundation) canonical data model — Agent Card subset.
 *
 * Source: `.agents/research/a2a-protocol-research.md` (2026-08-08).
 * Fields beyond the research table follow the A2A v1.0 AgentCard spec
 * (`capabilities`, `skills`) so cards are v1.0-compliant.
 */

/** Protocol bindings defined by A2A v1.0. */
export type A2AProtocolBinding = "JSONRPC" | "GRPC" | "HTTP+JSON";

/** One reachable endpoint of an agent, bound to a protocol. */
export interface AgentInterface {
  readonly url: string;
  readonly protocolBinding: A2AProtocolBinding;
  readonly protocolVersion: string;
}

/** A2A v1.0 AgentCapabilities. */
export interface AgentCapabilities {
  readonly streaming?: boolean;
  readonly pushNotifications?: boolean;
  readonly stateTransitionHistory?: boolean;
  readonly agentCardUrl?: string;
}

/** A2A v1.0 AgentSkill — advertised capability of the remote agent. */
export interface AgentSkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tags?: readonly string[];
  readonly examples?: readonly string[];
}

/** OpenAPI-style security scheme descriptor (vendor schemes pass through). */
export interface AgentSecurityScheme {
  readonly type: string;
  readonly [key: string]: unknown;
}

/** A2A v1.0 Agent Card (canonical JSON served at the discovery URL). */
export interface AgentCard {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly supportedInterfaces: readonly AgentInterface[];
  readonly capabilities: AgentCapabilities;
  readonly skills: readonly AgentSkill[];
  readonly defaultInputModes: readonly string[];
  readonly defaultOutputModes: readonly string[];
  readonly securitySchemes?: Record<string, AgentSecurityScheme>;
}

/**
 * A2A task lifecycle — STRICT state machine (7 states, research §Task States).
 * Do not widen: closed union is the contract.
 */
export type TaskState =
  | "TASK_STATE_SUBMITTED"
  | "TASK_STATE_WORKING"
  | "TASK_STATE_INPUT_REQUIRED"
  | "TASK_STATE_COMPLETED"
  | "TASK_STATE_FAILED"
  | "TASK_STATE_CANCELED"
  | "TASK_STATE_REJECTED";

/** All A2A task states in lifecycle order. */
export const KNOWN_TASK_STATES: readonly TaskState[] = [
  "TASK_STATE_SUBMITTED",
  "TASK_STATE_WORKING",
  "TASK_STATE_INPUT_REQUIRED",
  "TASK_STATE_COMPLETED",
  "TASK_STATE_FAILED",
  "TASK_STATE_CANCELED",
  "TASK_STATE_REJECTED",
];

/** Narrow an untrusted string to {@link TaskState}. */
export function isKnownTaskState(value: string): value is TaskState {
  return (KNOWN_TASK_STATES as readonly string[]).includes(value);
}

/** Terminal states: no further transitions out. */
export function isTerminalTaskState(state: TaskState): boolean {
  return (
    state === "TASK_STATE_COMPLETED" ||
    state === "TASK_STATE_FAILED" ||
    state === "TASK_STATE_CANCELED" ||
    state === "TASK_STATE_REJECTED"
  );
}
