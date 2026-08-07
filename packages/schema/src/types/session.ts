import type { SessionId, MessageId, ToolCallId, AgentId, WorkspaceId } from "../contracts/branded.js";

export interface Session {
  readonly id: SessionId;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly parentSessionId?: SessionId;
  readonly agentId?: AgentId;
  readonly model?: string;
  readonly cost?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly location?: { directory: string; workspaceId?: WorkspaceId };
  readonly isActive: boolean;
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
  readonly cost?: number;
  readonly createdAt: string;
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
