import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import type { MessageContentPart } from "@vinhnt-sdk/schema";
import { ValidationError } from "@vinhnt-sdk/schema";
import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";
import type { ToolContext } from "@vinhnt-sdk/tools";
import { ensurePathAccess, isWithinWorkspace, resolveRoot, type RootGetter } from "./file-tools.js";

const ReadImageSchema = z.object({
  filePath: z.string().min(1),
});

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const DEFAULT_MAX_IMAGE_SIZE = 8 * 1024 * 1024;

/** Sniff the first bytes of a buffer to confirm it matches the claimed extension. */
function sniffMagic(buffer: Buffer, mimeType: string): boolean {
  switch (mimeType) {
    case "image/png":
      return buffer.length >= 8 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.readUInt32BE(4) === 0x0d0a1a0a;
    case "image/jpeg":
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/gif":
      return buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF89a";
    case "image/webp": {
      if (buffer.length < 12) return false;
      const riff = buffer.subarray(0, 4).toString("ascii");
      const webp = buffer.subarray(8, 12).toString("ascii");
      return riff === "RIFF" && webp === "WEBP";
    }
    default:
      return true;
  }
}

/**
 * Read an image file into model message parts (`text` + base64 `image`),
 * validating the file extension, magic bytes and workspace containment.
 *
 * When `workspaceRoot` is provided the path is checked against the workspace
 * boundary (realpath-aware, symlink-safe) before reading.
 */
export function readImageToContentParts(filePath: string, workspaceRoot?: RootGetter, externalDirAccess?: boolean): Promise<MessageContentPart[]> {
  return readImageToContentPartsInner(filePath, workspaceRoot, externalDirAccess);
}

async function readImageToContentPartsInner(filePath: string, workspaceRoot?: RootGetter, externalDirAccess?: boolean, ctx?: ToolContext, maxSize?: number): Promise<MessageContentPart[]> {
  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    throw new ValidationError(`Unsupported image format: ${ext}. Supported: png, jpg, jpeg, gif, webp`);
  }

  const target = workspaceRoot ? await ensurePathAccess(resolve(resolveRoot(workspaceRoot), filePath), resolveRoot(workspaceRoot), filePath, ctx ?? { ask: async () => "reject" } as unknown as ToolContext, externalDirAccess) : filePath;

  const buffer = await readFile(target);
  const cap = maxSize ?? DEFAULT_MAX_IMAGE_SIZE;
  if (buffer.length > cap) {
    throw new ValidationError(`Image too large (${buffer.length} bytes). Max: ${cap} bytes`);
  }
  if (!sniffMagic(buffer, mimeType)) {
    throw new ValidationError(`File "${filePath}" does not match its extension (${ext}) — magic bytes mismatch`);
  }
  const base64 = buffer.toString("base64");

  return [
    { type: "text", text: `[Image: ${filePath}]` },
    { type: "image", image: base64, mimeType },
  ];
}

/** Create the `read_image` tool that returns image content for the model to analyze. */
export function createReadImageTool(workspaceRoot: RootGetter, externalDirAccess?: boolean) {
  return defineTool<{ filePath: string }, {
    filePath: string; mimeType?: string | undefined; size: number; message: string;
  }>({
    name: "read_image",
    description: "Read an image file and return its content for the model to analyze",
    risk: "read",
    input: ReadImageSchema,
    normalize: (input: unknown) => {
      const v = input as Record<string, unknown> | null | undefined;
      if (!v || typeof v !== "object") return {};
      if (!v.filePath && v.path && typeof v.path === "string") {
        return { filePath: v.path };
      }
      return v as Record<string, unknown>;
    },
    jsonSchema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Path relative to workspace root" },
        path: { type: "string", description: "Alias for filePath" },
      },
    },
    async execute(v, ctx) {
      const filePath = v.filePath;
      const parts = await readImageToContentPartsInner(filePath, workspaceRoot, externalDirAccess, ctx);
      return {
        filePath,
        mimeType: parts[1] && "mimeType" in parts[1] ? (parts[1] as { mimeType?: string }).mimeType : undefined,
        size: parts[1] && "image" in parts[1] ? (parts[1] as { image: string }).image.length : 0,
        message: `Image loaded: ${filePath}`,
      };
    },
  }).toDefinition();
}

export { isWithinWorkspace };
