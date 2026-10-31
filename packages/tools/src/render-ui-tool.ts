import { z } from "zod";
import { UiSurfaceComponentSchema, type UiSurface, type UiSurfaceComponent } from "@vinhnt-sdk/schema";
import { defineTool } from "./index.js";

/** Options for {@link createRenderUiTool}. */
export interface RenderUiToolOptions {
  /** Hard cap on components per surface (default 60). */
  maxComponents?: number;
}

const DEFAULT_MAX_COMPONENTS = 60;

const TONES = ["neutral", "info", "success", "warning", "danger"] as const;

/** JSON Schema for a single surface component (documentation for the model). */
const COMPONENT_SCHEMA = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["text", "markdown", "keyValue", "table", "callout", "codeBlock", "progress", "badge", "list", "actions", "html"],
      description:
        "Component kind (from the approved catalog). Use \"actions\" for clickable buttons the user can press " +
        "to send a choice back to you (each item: {id, label, tone?, value?}). Use \"html\" only for " +
        "self-contained HTML widgets; it is rendered in a sandboxed iframe.",
    },
    text: { type: "string", description: "Body text (text | callout)." },
    markdown: { type: "string", description: "Markdown source (markdown)." },
    code: { type: "string", description: "Code source (codeBlock)." },
    html: { type: "string", description: "Self-contained HTML document (html)." },
    language: { type: "string", description: "Language hint (codeBlock)." },
    title: { type: "string", description: "Optional heading (callout | html)." },
    height: { type: "number", description: "Iframe height in px, 80-1200 (html, default 320)." },
    allowScripts: { type: "boolean", description: "Allow scripts inside the sandboxed iframe (html, default false)." },
    tone: { type: "string", enum: [...TONES], description: "Semantic color (callout | badge)." },
    label: { type: "string", description: "Label text (badge | progress)." },
    value: { type: "number", description: "Current value (progress)." },
    max: { type: "number", description: "Maximum value (progress, default 100)." },
    items: {
      type: "array",
      description:
        "Rows (keyValue: {label,value}[]), lines (list: string[]), or buttons " +
        "(actions: {id,label,tone?,value?}[]).",
    },
    columns: { type: "array", items: { type: "string" }, description: "Header cells (table)." },
    rows: { type: "array", items: { type: "array", items: { type: "string" } }, description: "Body rows (table)." },
    ordered: { type: "boolean", description: "Ordered list (list)." },
  },
  required: ["type"],
} as const;

/**
 * Create the `render_ui` tool — renders a generative-UI surface from a closed,
 * client-approved catalog. Components are validated against
 * {@link UiSurfaceComponentSchema}; invalid ones are dropped. The tool never
 * executes code and does not block the run.
 */
export function createRenderUiTool(options: RenderUiToolOptions = {}) {
  const maxComponents = options.maxComponents ?? DEFAULT_MAX_COMPONENTS;

  return defineTool<unknown, unknown>({
    name: "render_ui",
    label: "Render UI",
    description:
      "Render a visual surface (table, chart-like list, key/value, callout, code, progress) for the user. " +
      "Pass `components[]` from the approved catalog; each component has a `type` plus its fields. " +
      "Reuse the same `surfaceId` to update a surface in place, or pass `action:\"delete\"` to remove it. " +
      "An `actions` component renders buttons the user can click to send a choice back to you. " +
      "An `html` component renders a self-contained widget in a sandboxed iframe (no network access; " +
      "scripts off unless `allowScripts:true`). Use this for structured, scannable output instead of long prose.",
    risk: "read",
    input: z.unknown(),
    jsonSchema: {
      type: "object",
      properties: {
        surfaceId: { type: "string", description: "Stable id; reuse it to update an existing surface." },
        title: { type: "string", description: "Optional surface heading." },
        description: { type: "string", description: "Optional one-line summary under the heading." },
        action: { type: "string", enum: ["upsert", "delete"], description: "Upsert (default) or delete the surface." },
        components: { type: "array", items: COMPONENT_SCHEMA, description: "Ordered surface components." },
      },
      required: ["components"],
    },
    async execute(raw, ctx) {
      const v = (raw ?? {}) as Record<string, unknown>;
      const context = ctx as {
        sessionId?: string;
        presentSurface?: (surface: UiSurface) => Promise<void> | void;
      } | undefined;

      if (typeof context?.presentSurface !== "function") {
        return { error: "Surface rendering is not supported by this host" };
      }

      const surfaceId = typeof v.surfaceId === "string" && v.surfaceId ? v.surfaceId : crypto.randomUUID();

      // Deletion: drop the surface and stop.
      if (v.action === "delete") {
        await context.presentSurface({ surfaceId, components: [] });
        return { ok: true, surfaceId, action: "delete", message: `Surface ${surfaceId} deleted` };
      }

      const rawComponents = Array.isArray(v.components) ? v.components : [];
      const components: UiSurfaceComponent[] = [];
      let dropped = 0;
      for (const rawComponent of rawComponents) {
        const parsed = UiSurfaceComponentSchema.safeParse(rawComponent);
        // `parsed.data` is the Zod-inferred component; structurally identical to
        // the contract's `UiSurfaceComponent` (optional fields differ only by
        // `exactOptionalPropertyTypes`).
        if (parsed.success) components.push(parsed.data as UiSurfaceComponent);
        else dropped += 1;
        if (components.length >= maxComponents) break;
      }

      if (components.length === 0) {
        return { error: "No valid components (from the approved catalog) were provided" };
      }

      const title = typeof v.title === "string" ? v.title : undefined;
      const description = typeof v.description === "string" ? v.description : undefined;
      const surface: UiSurface = {
        surfaceId,
        components,
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
      };

      await context.presentSurface(surface);

      return {
        ok: true,
        surfaceId,
        components: components.length,
        ...(dropped > 0 ? { droppedComponents: dropped } : {}),
        message: `Rendered surface ${surfaceId} with ${components.length} component${components.length === 1 ? "" : "s"}`,
      };
    },
  }).toDefinition();
}
