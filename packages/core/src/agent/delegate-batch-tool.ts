import type { AgentId, RequestId, TraceId, RequestContext } from "@vinhnt-sdk/schema";
import type { AgentKernel } from "../kernel/kernel.js";
import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";

export interface DelegateBatchInput {
  tasks: Array<{ agentId: string; prompt: string }>;
}

const DelegateBatchSchema = z.object({
  tasks: z.array(z.object({
    agentId: z.string(),
    prompt: z.string(),
  })),
});

/** Tool for delegating tasks to multiple sub-agents in parallel */
export function createDelegateBatchTool(kernel: AgentKernel) {
  return defineTool<DelegateBatchInput, string>({
    name: "delegate_batch",
    description: "Delegate multiple tasks to sub-agents in parallel. Each task runs concurrently with its own isolated state. Use this when tasks are independent and can be resolved simultaneously.",
    risk: "write",
    input: DelegateBatchSchema,
    jsonSchema: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          description: "Array of tasks to delegate",
          items: {
            type: "object",
            properties: {
              agentId: { type: "string", description: "The ID of the sub-agent" },
              prompt: { type: "string", description: "The task description for the sub-agent" },
            },
            required: ["agentId", "prompt"],
          },
        },
      },
      required: ["tasks"],
    },
    async execute(input, ctx): Promise<string> {
      const parent = ctx?.parentContext;
      const childCtx: RequestContext = parent
        ? { ...parent }
        : {
            requestId: crypto.randomUUID() as RequestId,
            traceId: crypto.randomUUID() as TraceId,
            actorId: "sub-agent",
            tenantId: "default",
          };
      return kernel.runAgentsParallel(
        input.tasks.map((t) => ({ agentId: t.agentId as AgentId, prompt: t.prompt })),
        childCtx,
        ctx?.sessionId || undefined,
      );
    },
  }).toDefinition();
}
