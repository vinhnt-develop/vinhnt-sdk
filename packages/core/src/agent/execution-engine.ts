import type { AgentId, RequestId, RequestContext, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { AgentRegistry } from "../agent/agent-registry.js";
import type { AgentKernel } from "../kernel/kernel.js";
import { getCompletedEventData } from "../kernel/sub-agent-runner.js";
import { RequestContextSchema } from "@vinhnt-sdk/schema";
import { type ZodError } from "zod";

export type ExecutionResult = {
  runId: string;
  agentId: string;
  agentName: string;
  output: string | undefined;
  status: string;
  error: string | undefined;
  ctx: RequestContext;
  durationMs: number;
};

export class ExecutionEngine {
  private kernel: AgentKernel;

  constructor(
    private readonly registry: AgentRegistry,
    kernel: AgentKernel,
  ) {
    this.kernel = kernel;
  }

  async execute(
    agentId: AgentId,
    prompt: string,
    ctx?: RequestContext,
    parentRunId?: RunId,
  ): Promise<ExecutionResult> {
    const agent = await this.registry.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const validCtx = ctx ?? createCtx(parentRunId);
    if (parentRunId && !validCtx.parentRunId) {
      (validCtx as unknown as Record<string, unknown>).parentRunId = parentRunId;
    }
    RequestContextSchema.parse(validCtx);

    const start = Date.now();
    this.kernel.setCurrentAgent(agent);
    const handle = this.kernel.run(prompt, validCtx);
    await handle.completed;
    const durationMs = Date.now() - start;

    const store = this.kernel.getEventStore();
    const completedData = await getCompletedEventData(store, handle.runId);
    const data = completedData as unknown as Record<string, unknown> | undefined;

    return {
      runId: handle.runId,
      agentId: agent.id,
      agentName: agent.profile.name,
      output: data?.output as string | undefined,
      status: (data?.status as string) ?? "unknown",
      error: data?.error as string | undefined,
      ctx: validCtx,
      durationMs,
    };
  }

  async executeBatch(
    tasks: Array<{ agentId: AgentId; prompt: string }>,
    ctx?: RequestContext,
    parentRunId?: RunId,
  ): Promise<ExecutionResult[]> {
    const baseCtx = ctx ?? createCtx(parentRunId);
    return Promise.all(
      tasks.map((t) => {
        const taskCtx: RequestContext = {
          ...baseCtx,
          requestId: crypto.randomUUID() as RequestId,
        };
        return this.execute(t.agentId, t.prompt, taskCtx, parentRunId);
      }),
    );
  }

  async executeWithValidation(
    agentId: AgentId,
    prompt: string,
    ctx?: RequestContext,
    parentRunId?: RunId,
  ): Promise<ExecutionResult> {
    try {
      return await this.execute(agentId, prompt, ctx, parentRunId);
    } catch (err) {
      const zodErr = err as ZodError;
      return {
        runId: "",
        agentId,
        agentName: "unknown",
        output: undefined,
        status: "failed",
        error: zodErr?.issues
          ? zodErr.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
          : (err as Error).message,
        ctx: ctx ?? createCtx(parentRunId),
        durationMs: 0,
      };
    }
  }
}

function createCtx(parentRunId?: RunId): RequestContext {
  const ctx: RequestContext = {
    requestId: crypto.randomUUID() as RequestId,
    traceId: crypto.randomUUID() as TraceId,
    actorId: "execution-engine",
    tenantId: "default",
  };
  if (parentRunId) (ctx as unknown as Record<string, unknown>).parentRunId = parentRunId;
  return ctx;
}
