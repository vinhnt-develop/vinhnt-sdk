import type { AgentKernel } from "../kernel/kernel.js";
import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";

export interface SpawnAgentInput {
  name?: string | undefined;
  description?: string | undefined;
  mode?: string | undefined;
  capabilities?: string[] | undefined;
  systemPrompt?: string | undefined;
  temperature?: number | undefined;
  allowedTools?: string[] | undefined;
  deniedTools?: string[] | undefined;
  maxSteps?: number | undefined;
  maxTokens?: number | undefined;
}

function normalizeSpawnInput(raw: Record<string, unknown>): SpawnAgentInput {
  const name = String(raw.name ?? raw.mode ?? raw.id ?? "").trim() || undefined;
  const caps = Array.isArray(raw.capabilities) ? (raw.capabilities as string[]).join(", ") : "";
  const description = String(raw.description ?? caps ?? "").trim() || undefined;

  if (!name) throw new Error("Sub-agent name is required — provide 'name' (or 'mode')");
  if (!description) throw new Error("Sub-agent description is required — provide 'description' (or 'capabilities')");

  return {
    name,
    description,
    ...(raw.systemPrompt !== undefined ? { systemPrompt: String(raw.systemPrompt) } : {}),
    ...(raw.temperature !== undefined ? { temperature: Number(raw.temperature) } : {}),
    ...(raw.allowedTools !== undefined ? { allowedTools: raw.allowedTools as string[] } : {}),
    ...(raw.deniedTools !== undefined ? { deniedTools: raw.deniedTools as string[] } : {}),
    ...(raw.maxSteps !== undefined ? { maxSteps: Number(raw.maxSteps) } : {}),
    ...(raw.maxTokens !== undefined ? { maxTokens: Number(raw.maxTokens) } : {}),
  };
}

const SpawnInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  mode: z.string().optional(),
  id: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().optional(),
  allowedTools: z.array(z.string()).optional(),
  deniedTools: z.array(z.string()).optional(),
  maxSteps: z.number().optional(),
  maxTokens: z.number().optional(),
});

export function createSpawnAgentTool(kernel: AgentKernel) {
  return defineTool<SpawnAgentInput, string>({
    name: "spawn_agent",
    description: "Create a sub-agent with inherited permissions. Use this to delegate tasks to specialized agents.",
    risk: "write",
    input: SpawnInputSchema,
    normalize: (raw) => normalizeSpawnInput(raw as Record<string, unknown>),
    jsonSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the sub-agent" },
        description: { type: "string", description: "Description of the sub-agent's purpose" },
        mode: { type: "string", description: "Alias for 'name' (LLM-friendly)" },
        capabilities: { type: "array", items: { type: "string" }, description: "Alias for 'description' — auto-joined as description" },
        systemPrompt: { type: "string", description: "System prompt for the sub-agent" },
        temperature: { type: "number", description: "Temperature for the sub-agent (0-2)" },
        allowedTools: { type: "array", items: { type: "string" }, description: "Restrict to specific tools" },
        deniedTools: { type: "array", items: { type: "string" }, description: "Deny specific tools" },
        maxSteps: { type: "number", description: "Max steps for the sub-agent" },
        maxTokens: { type: "number", description: "Max tokens for the sub-agent" },
      },
      required: [],
    },
    async execute(input): Promise<string> {
      const hasPerms = input.allowedTools || input.deniedTools || input.maxSteps !== undefined || input.maxTokens !== undefined;
      const agent = await kernel.spawnAgent({
        profile: { name: input.name!, description: input.description! },
        ...(input.systemPrompt !== undefined ? { systemPrompt: input.systemPrompt } : {}),
        ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
        ...(hasPerms ? {
          permissions: {
            ...(input.allowedTools ? { allowedTools: input.allowedTools } : {}),
            ...(input.deniedTools ? { deniedTools: input.deniedTools } : {}),
            ...(input.maxSteps !== undefined ? { maxSteps: input.maxSteps } : {}),
            ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
          },
        } : {}),
      });
      return `Sub-agent "${agent.profile.name}" created with ID: ${agent.id}`;
    },
  }).toDefinition();
}
