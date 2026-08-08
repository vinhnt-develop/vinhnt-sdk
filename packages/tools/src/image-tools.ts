import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { MessageContentPart } from "@vinhnt-sdk/schema";
import { z } from "zod";
import { defineTool } from "./define-tool.js";

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

export function readImageToContentParts(filePath: string): Promise<MessageContentPart[]> {
  return readImageToContentPartsInner(filePath);
}

async function readImageToContentPartsInner(filePath: string): Promise<MessageContentPart[]> {
  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    throw new Error(`Unsupported image format: ${ext}. Supported: png, jpg, jpeg, gif, webp`);
  }

  const buffer = await readFile(filePath);
  const base64 = buffer.toString("base64");

  return [
    { type: "text", text: `[Image: ${filePath}]` },
    { type: "image", image: base64, mimeType },
  ];
}

export function createReadImageTool() {
  return defineTool<{ filePath: string }, {
    filePath: string; mimeType?: string; size: number; message: string;
  }>({
    name: "read_image",
    description: "Read an image file and return its content for the model to analyze",
    risk: "read",
    input: ReadImageSchema,
    jsonSchema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Path to the image file" },
      },
      required: ["filePath"],
    },
    async execute(v) {
      const parts = await readImageToContentParts(v.filePath);
      return {
        filePath: v.filePath,
        mimeType: parts[1] && "mimeType" in parts[1] ? (parts[1] as { mimeType?: string }).mimeType : undefined,
        size: parts[1] && "image" in parts[1] ? (parts[1] as { image: string }).image.length : 0,
        message: `Image loaded: ${v.filePath}`,
      };
    },
  }).toDefinition();
}
