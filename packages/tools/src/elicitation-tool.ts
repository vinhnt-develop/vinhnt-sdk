import { z } from "zod";
import { defineTool } from "./index.js";
import { ElicitationRequestedSchemaSchema } from "@vinhnt-sdk/schema";
import type { ElicitationMode, ElicitationRequestedSchema } from "@vinhnt-sdk/schema";
import type {
  ElicitationRequest,
  ElicitationReply,
  ElicitationAction,
} from "./elicitation-store.js";

/** Resolver that returns the user's response for an {@link ElicitationRequest}. */
export type ElicitationHandler = (
  request: ElicitationRequest,
) => Promise<ElicitationReply>;

/** Options for {@link createElicitTool}. */
export interface ElicitToolOptions {
  /**
   * App-supplied resolver. When omitted, the tool uses `ctx.askElicitation`
   * (the host-owned durable request/reply path).
   */
  handler?: ElicitationHandler;
  /** Hard timeout in ms for the whole request. */
  timeoutMs?: number;
}

const InputSchema = z.object({
  message: z.string().min(1),
  mode: z.enum(["form", "url"]).optional(),
  url: z.string().optional(),
  requestedSchema: ElicitationRequestedSchemaSchema.optional(),
});

/** Format the reply into a short text answer the model can read. */
function formatAnswer(reply: ElicitationReply): string {
  if (reply.action === "decline") return "User declined the request.";
  if (reply.action === "cancel") return "Elicitation cancelled.";
  const content = reply.content ?? {};
  const entries = Object.entries(content);
  if (entries.length === 0) return "User accepted but provided no values.";
  return entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join("\n");
}

/** Render a single accepted value for the model. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(none)";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Create the `elicit` tool that requests structured input from the user via a
 * schema-driven form (MCP `elicitation/create` shape) and blocks until they
 * respond. Prefers the host-owned `ctx.askElicitation` request/reply path; an
 * {@link ElicitationHandler} may be injected instead.
 */
export function createElicitTool(handlerOrOptions?: ElicitationHandler | ElicitToolOptions) {
  const options: ElicitToolOptions =
    typeof handlerOrOptions === "function"
      ? { handler: handlerOrOptions }
      : (handlerOrOptions ?? {});

  return defineTool<unknown, unknown>({
    name: "elicit",
    description:
      "Request structured input from the user and get their response. Use this when you need a small set of typed values " +
      "(e.g. a name, an amount, a yes/no choice) rather than a free-form question. " +
      "Provide a flat `requestedSchema` (JSON Schema object with primitive string/number/integer/boolean properties) to render a form, " +
      "or `mode: \"url\"` with a `url` to ask the user to open a link. The user may accept, decline, or cancel.",
    risk: "external",
    input: z.unknown(),
    jsonSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Human-readable prompt shown above the form explaining what you need",
        },
        mode: {
          type: "string",
          enum: ["form", "url"],
          description: "Delivery mode: 'form' (default) renders a schema-driven form; 'url' asks the user to open a link",
        },
        url: { type: "string", description: "Target URL when mode is 'url'" },
        requestedSchema: {
          type: "object",
          description:
            "Flat JSON Schema (type 'object') describing form fields. Each property must be a primitive: " +
            "{ type: 'string' | 'number' | 'integer' | 'boolean', title?, description?, default?, enum? (string), enumNames?, minimum?, maximum?, minLength?, maxLength?, format? }",
          properties: {
            type: { type: "string", enum: ["object"] },
            properties: { type: "object", description: "Map of field name → primitive field schema" },
            required: { type: "array", items: { type: "string" }, description: "Names of required fields" },
          },
          required: ["type", "properties"],
        },
      },
      required: ["message"],
    },
    async execute(raw, ctx) {
      const parsed = InputSchema.safeParse((raw ?? {}) as Record<string, unknown>);
      if (!parsed.success) {
        return { error: `Invalid elicit input: ${parsed.error.issues[0]?.message ?? "validation failed"}` };
      }
      const input = parsed.data;
      const mode: ElicitationMode = input.mode ?? "form";

      if (mode === "url") {
        if (!input.url) return { error: "`url` is required when mode is 'url'" };
      } else if (!input.requestedSchema) {
        return { error: "`requestedSchema` is required when mode is 'form'" };
      } else if (Object.keys(input.requestedSchema.properties).length === 0) {
        return { error: "`requestedSchema.properties` must declare at least one field" };
      }

      const context = ctx as { sessionId?: string; runId?: string; askElicitation?: (i: {
        message: string;
        mode?: ElicitationMode;
        url?: string;
        requestedSchema?: ElicitationRequestedSchema;
        timeoutMs?: number;
      }) => Promise<ElicitationReply> } | undefined;

      let reply: ElicitationReply = { action: "cancel" };
      if (options.handler) {
        const request: ElicitationRequest = {
          requestId: crypto.randomUUID(),
          runId: context?.runId ?? "",
          sessionId: context?.sessionId ?? "",
          message: input.message,
          mode,
          ...(input.url !== undefined ? { url: input.url } : {}),
          ...(input.requestedSchema !== undefined ? { requestedSchema: input.requestedSchema as ElicitationRequestedSchema } : {}),
          ...(options.timeoutMs !== undefined ? { expiresAt: Date.now() + options.timeoutMs } : {}),
        };
        reply = await options.handler(request);
      } else if (typeof context?.askElicitation === "function") {
        reply = await context.askElicitation({
          message: input.message,
          mode,
          ...(input.url !== undefined ? { url: input.url } : {}),
          ...(input.requestedSchema !== undefined ? { requestedSchema: input.requestedSchema as ElicitationRequestedSchema } : {}),
          ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
        });
      } else {
        return {
          action: "cancel" as ElicitationAction,
          answer: "No elicitation handler configured",
          error: "No elicitation handler configured",
        };
      }

      return {
        action: reply.action,
        ...(reply.content !== undefined ? { content: reply.content } : {}),
        answer: formatAnswer(reply),
      };
    },
  }).toDefinition();
}
