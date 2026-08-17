import type { AgentId, RequestId, TraceId, RequestContext, RunId } from "@vinhnt-sdk/schema";
import type { AgentKernel } from "../kernel/kernel.js";
import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";

export interface DelegateInput {
  agentId: string;
  prompt: string;
  agent_id?: string;
  task?: string;
}

const DelegateInputSchema = z.object({
  agentId: z.string(),
  prompt: z.string(),
});

/** Tool for delegating a task to a sub-agent */
export function createDelegateTool(kernel: AgentKernel) {
  return defineTool<{ agentId: string; prompt: string }, string>({
    name: "delegate",
    description: "Delegate a task to a sub-agent by ID. The sub-agent will run with its own permissions and return a result. Use this for specialized subtasks.",
    risk: "write",
    input: DelegateInputSchema,
    normalize(raw) {
      const input = raw as Record<string, unknown>;
      const agentId = String(input.agentId ?? input.agent_id ?? "").trim();
      const prompt = String(input.prompt ?? input.task ?? "").trim();
      if (!agentId) throw new Error("Agent ID is required — provide 'agentId' or 'agent_id'");
      if (!prompt) throw new Error("Prompt is required — provide 'prompt' or 'task'");
      return { agentId, prompt };
    },
    jsonSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "The ID of the sub-agent to delegate to" },
        agent_id: { type: "string", description: "Alias for 'agentId' (snake_case)" },
        prompt: { type: "string", description: "The task description for the sub-agent" },
        task: { type: "string", description: "Alias for 'prompt'" },
      },
      required: [],
    },
    async execute(input, ctx): Promise<string> {
      const parent = ctx.parentContext;
      const childCtx: RequestContext = parent
        ? { ...parent }
        : {
            requestId: crypto.randomUUID() as RequestId,
            traceId: crypto.randomUUID() as TraceId,
            actorId: "sub-agent",
            tenantId: "default",
          };
      const output = await kernel.runAgent(
        input.agentId as AgentId, input.prompt, childCtx, ctx.sessionId || undefined, ctx.runId as RunId | undefined,
      );
      return output || "(no output)";
    },
  }).toDefinition();
}
