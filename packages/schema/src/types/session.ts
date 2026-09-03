import type { SessionId, MessageId, ToolCallId, AgentId, WorkspaceId } from "../contracts/branded.js";

export interface Session {
  readonly id: SessionId;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly parentSessionId?: SessionId;
  readonly agentId?: AgentId;
  readonly model?: string;
  /** Provider that served this session's model calls. */
  readonly provider?: string;
  readonly cost?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly location?: { directory: string; workspaceId?: WorkspaceId };
  readonly isActive: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface MessageTokens {
  readonly input: number;
  readonly output: number;
  readonly reasoning?: number;
}

export interface Message {
  readonly id: MessageId;
  readonly sessionId: SessionId;
  readonly role: string;
  readonly content: string;
  readonly toolCallId?: ToolCallId;
  readonly tokens?: MessageTokens;
  readonly model?: string;
  /** Provider that generated this message (attribution). */
  readonly provider?: string;
  readonly cost?: number;
  readonly createdAt: string;
  /** Admission order for pending user inputs (RV-21). Persisted once and never changed. */
  readonly admittedSeq?: number;
  /** Set to the admitted seq once the input has been drained into a run (RV-21). */
  readonly promotedSeq?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface SessionStats {
  readonly totalSessions: number;
  readonly totalCost: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalMessages: number;
  readonly sessionsByDate: Array<{ date: string; count: number }>;
  readonly costByModel: Array<{ model: string; cost: number }>;
}
