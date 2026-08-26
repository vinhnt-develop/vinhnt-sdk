import type { AgentKernel } from "../kernel/kernel.js";
import { createAgent, createSubAgent } from "./agent-factory.js";
import type { CreateAgentParams, SubAgentParams } from "./agent-factory.js";
import type { AgentId } from "@vinhnt-sdk/schema";
import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";

export interface CreateAgentInput {
  name: string;
  description: string;
  systemPrompt?: string | undefined;
  temperature?: number | undefined;
  model?: string | undefined;
  hidden?: boolean | undefined;
  tools?: string[] | undefined;
  allowedTools?: string[] | undefined;
  deniedTools?: string[] | undefined;
  allowedRisks?: string[] | undefined;
  maxSteps?: number | undefined;
  maxTokens?: number | undefined;
  streaming?: boolean | undefined;
  thinking?: boolean | undefined;
  parentAgentId?: string | undefined;
}

const CreateAgentInputSchema = z.object({
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string().optional(),
  temperature: z.number().optional(),
  model: z.string().optional(),
  hidden: z.boolean().optional(),
  tools: z.array(z.string()).optional(),
  allowedTools: z.array(z.string()).optional(),
  deniedTools: z.array(z.string()).optional(),
  allowedRisks: z.array(z.string()).optional(),
  maxSteps: z.number().optional(),
  maxTokens: z.number().optional(),
  streaming: z.boolean().optional(),
  thinking: z.boolean().optional(),
  parentAgentId: z.string().optional(),
});

export function createCreateAgentTool(kernel: AgentKernel) {
  return defineTool<CreateAgentInput, string>({
    name: "create_agent",
    description: "Create a new agent with specified capabilities and permissions. Use this to create specialized agents that can be delegated tasks.",
    risk: "write",
    input: CreateAgentInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the new agent" },
        description: { type: "string", description: "Description of the agent's purpose and capabilities" },
        systemPrompt: { type: "string", description: "Custom system prompt for the agent" },
        temperature: { type: "number", description: "Temperature for LLM calls (0-2)" },
        model: { type: "string", description: "Preferred model identifier (e.g. gpt-4o, claude-3-5-sonnet)" },
        hidden: { type: "boolean", description: "If true, exclude from public listings" },
        tools: { type: "array", items: { type: "string" }, description: "Restrict to specific tool IDs (glob patterns supported)" },
        allowedTools: { type: "array", items: { type: "string" }, description: "Tools the agent is allowed to use" },
        deniedTools: { type: "array", items: { type: "string" }, description: "Tools the agent is denied from using" },
        allowedRisks: { type: "array", items: { type: "string" }, description: "Risk levels the agent can operate at" },
        maxSteps: { type: "number", description: "Maximum execution steps before forced stop" },
        maxTokens: { type: "number", description: "Maximum tokens per run" },
        streaming: { type: "boolean", description: "Enable streaming responses" },
        thinking: { type: "boolean", description: "Enable thinking/reasoning step" },
        parentAgentId: { type: "string", description: "Parent agent ID for permission inheritance (creates a sub-agent)" },
      },
      required: ["name", "description"],
    },
    async execute(input): Promise<string> {
      const registry = kernel.getAgentRegistry();
      if (!registry) throw new Error("No agent registry available");

      const hasPerms = input.allowedTools || input.deniedTools || input.maxSteps !== undefined || input.maxTokens !== undefined || input.allowedRisks;
      const hasCaps = input.tools || input.streaming !== undefined || input.thinking !== undefined;

      if (input.parentAgentId) {
        const parent = await registry.get(input.parentAgentId as AgentId);
        if (!parent) throw new Error(`Parent agent not found: ${input.parentAgentId}`);
        const subParams: SubAgentParams = {
          profile: { name: input.name, description: input.description },
          ...(input.systemPrompt !== undefined ? { systemPrompt: input.systemPrompt } : {}),
          ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
          ...(hasPerms ? {
            permissions: {
              ...(input.allowedTools ? { allowedTools: input.allowedTools } : {}),
              ...(input.deniedTools ? { deniedTools: input.deniedTools } : {}),
              ...(input.allowedRisks ? { allowedRisks: input.allowedRisks } : {}),
              ...(input.maxSteps !== undefined ? { maxSteps: input.maxSteps } : {}),
              ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
            },
          } : {}),
        };
        const agent = createSubAgent(subParams, parent);
        await registry.register(agent, input.parentAgentId as AgentId);
        return `Sub-agent "${agent.profile.name}" created with ID: ${agent.id}`;
      }

      const params: CreateAgentParams = {
        profile: {
          name: input.name,
          description: input.description,
          ...(input.model ? { model: input.model } : {}),
          ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
        },
        ...(input.systemPrompt !== undefined ? { systemPrompt: input.systemPrompt } : {}),
        ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
        ...(hasCaps ? {
          capabilities: {
            ...(input.tools ? { tools: input.tools } : {}),
            ...(input.streaming !== undefined ? { streaming: input.streaming } : {}),
            ...(input.thinking !== undefined ? { thinking: input.thinking } : {}),
          },
        } : {}),
        ...(hasPerms ? {
          permissions: {
            ...(input.allowedTools ? { allowedTools: input.allowedTools } : {}),
            ...(input.deniedTools ? { deniedTools: input.deniedTools } : {}),
            ...(input.allowedRisks ? { allowedRisks: input.allowedRisks } : {}),
            ...(input.maxSteps !== undefined ? { maxSteps: input.maxSteps } : {}),
            ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
          },
        } : {}),
      };
      const agent = createAgent(params);
      await registry.register(agent);
      return `Agent "${agent.profile.name}" created with ID: ${agent.id}`;
    },
  }).toDefinition();
}
