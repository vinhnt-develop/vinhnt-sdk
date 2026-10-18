import type { ToolContext, PermissionReply, QuestionReply } from "@vinhnt-sdk/tools";
import type { QuestionItem } from "@vinhnt-sdk/schema";

export class FakeToolContext implements ToolContext {
  readonly sessionId: string;
  readonly runId: string;
  readonly agentId: string;
  readonly agentName: string;
  readonly signal: AbortSignal;
  readonly env: Record<string, string>;
  private askFn: ((input: { permission: string; resource: string; reason: string }) => Promise<PermissionReply>) | null = null;
  private askQuestionFn: ((input: { questions: readonly QuestionItem[]; allowCustom?: boolean; timeoutMs?: number }) => Promise<QuestionReply>) | null = null;
  metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = [];

  constructor(overrides?: Partial<ToolContext>) {
    this.sessionId = overrides?.sessionId ?? "sess_test";
    this.runId = overrides?.runId ?? "run_test";
    this.agentId = overrides?.agentId ?? "agent_test";
    this.agentName = overrides?.agentName ?? "test-agent";
    this.signal = overrides?.signal ?? new AbortController().signal;
    this.env = overrides?.env ?? {};
  }

  /** Override the ask handler for custom behavior */
  setAskHandler(fn: typeof this.askFn): void {
    this.askFn = fn;
  }

  async ask(input: { permission: string; resource: string; reason: string }): Promise<PermissionReply> {
    if (this.askFn) return this.askFn(input);
    return "once";
  }

  /** Override the askQuestion handler for custom behavior */
  setAskQuestionHandler(fn: typeof this.askQuestionFn): void {
    this.askQuestionFn = fn;
  }

  async askQuestion(input: { questions: readonly QuestionItem[]; allowCustom?: boolean; timeoutMs?: number }): Promise<QuestionReply> {
    if (this.askQuestionFn) return this.askQuestionFn(input);
    return { action: "cancel" };
  }

  metadata(input: { title?: string; metadata?: Record<string, unknown> }): void {
    this.metadataCalls.push(input);
  }

  setCompensation(_action: () => Promise<void>): void {
    // no-op in fake
  }
}
