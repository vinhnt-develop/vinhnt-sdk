import type { SessionId, AgentId } from "../contracts/branded.js";

export interface SessionNode {
  readonly id: SessionId;
  readonly title: string;
  readonly agentId?: AgentId;
  readonly parentId?: SessionId;
  readonly children: readonly SessionNode[];
  readonly isActive: boolean;
  readonly createdAt: number;
  readonly depth: number;
}

export interface SessionTreeSnapshot {
  readonly rootId: SessionId | null;
  readonly nodes: SessionNode[];
  readonly activeSessionId: SessionId | null;
}

export interface TreeCursor {
  readonly sessionId: SessionId;
  readonly depth: number;
  readonly parentId?: SessionId;
  readonly firstChildId?: SessionId;
  readonly nextSiblingId?: SessionId;
  readonly prevSiblingId?: SessionId;
}

/** Known session tree event types. Use as reference, not exhaustive. */
export const KNOWN_SESSION_TREE_EVENT_TYPES = [
  "node.added",
  "node.removed",
  "node.moved",
  "node.activated",
  "node.title_changed",
] as const;

/** Session tree event type — open string for extensibility. */
export type SessionTreeEventType = string;

export interface SessionTreeEvent {
  readonly type: SessionTreeEventType;
  readonly sessionId: SessionId;
  readonly data: Record<string, unknown>;
}
