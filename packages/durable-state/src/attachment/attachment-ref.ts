import { AttachmentRefError } from "../errors.js";

/**
 * Kind of attachment — file or image.
 */
export type AttachmentKind = "file" | "image";

/**
 * A lightweight reference to a binary attachment stored outside JSON state.
 *
 * The attachment payload itself lives in an external store (filesystem, S3,
 * object storage). The checkpoint/snapshot only stores this reference,
 * avoiding base64 bloat in JSON snapshots while still allowing the attachment
 * to be resolved and restored when needed.
 *
 * @example
 * ```typescript
 * const ref: AttachmentRef = {
 *   id: "att_abc123",
 *   sessionId: "session_456",
 *   path: "/.vinhnt/uploads/session_456/2026-10-25/image.png",
 *   name: "screenshot.png",
 *   size: 245760,
 *   mimeType: "image/png",
 *   kind: "image",
 *   createdAt: "2026-10-25T03:35:00Z",
 * };
 * ```
 */
export interface AttachmentRef {
  /** Globally unique attachment identifier. */
  readonly id: string;
  /** Session the attachment belongs to. */
  readonly sessionId: string;
  /** Storage path — filesystem path or object-store key. */
  readonly path: string;
  /** Original file name. */
  readonly name: string;
  /** File size in bytes. */
  readonly size: number;
  /** MIME type (optional — inferred if not provided). */
  readonly mimeType?: string;
  /** "file" or "image". */
  readonly kind: AttachmentKind;
  /** ISO timestamp when the attachment was stored. */
  readonly createdAt: string;
}

/**
 * Create an AttachmentRef.
 */
export function createAttachmentRef(
  init: Omit<AttachmentRef, "id" | "createdAt"> & { id?: string; createdAt?: string },
): AttachmentRef {
  return {
    id: init.id ?? crypto.randomUUID(),
    sessionId: init.sessionId,
    path: init.path,
    name: init.name,
    size: init.size,
    mimeType: init.mimeType,
    kind: init.kind,
    createdAt: init.createdAt ?? new Date().toISOString(),
  };
}

/**
 * Abstract store for binary attachments — save, retrieve, list, delete.
 *
 * Implementations can use local filesystem (matching vinhnt-agent's
 * `POST /agent/uploads`), S3, or any object store.
 */
export interface BinaryAttachmentStore {
  /** Store binary content and return an AttachmentRef. */
  save(
    sessionId: string,
    name: string,
    content: Buffer | Uint8Array | ReadableStream<Uint8Array>,
    options?: { mimeType?: string; kind?: AttachmentKind },
  ): Promise<AttachmentRef>;
  /** Retrieve binary content by attachment id. */
  get(
    attachmentId: string,
  ): Promise<{ ref: AttachmentRef; content: ReadableStream<Uint8Array> }>;
  /** List attachments for a session. */
  list(sessionId: string): Promise<readonly AttachmentRef[]>;
  /** Delete an attachment by id. */
  delete(attachmentId: string): Promise<void>;
  /** Check whether an attachment exists. */
  exists(attachmentId: string): Promise<boolean>;
}

/**
 * In-memory binary attachment store — for development and testing only.
 * Not durable across process restarts.
 */
export class InMemoryBinaryAttachmentStore implements BinaryAttachmentStore {
  private readonly attachments = new Map<string, AttachmentRef>();
  private readonly contents = new Map<string, Uint8Array>();

  async save(
    sessionId: string,
    name: string,
    content: Buffer | Uint8Array | ReadableStream<Uint8Array>,
    options?: { mimeType?: string; kind?: AttachmentKind },
  ): Promise<AttachmentRef> {
    const bytes = await toBytes(content);
    const ref = createAttachmentRef({
      sessionId,
      name,
      path: `memory://${sessionId}/${name}`,
      size: bytes.length,
      mimeType: options?.mimeType,
      kind: options?.kind ?? "file",
    });
    this.attachments.set(ref.id, ref);
    this.contents.set(ref.id, bytes);
    return ref;
  }

  async get(attachmentId: string): Promise<{ ref: AttachmentRef; content: ReadableStream<Uint8Array> }> {
    const ref = this.attachments.get(attachmentId);
    if (ref === undefined) {
      throw new AttachmentRefError(attachmentId, `Attachment not found: ${attachmentId}`, {
        requestId: undefined,
        traceId: undefined,
      });
    }
    const content = this.contents.get(attachmentId);
    if (content === undefined) {
      throw new AttachmentRefError(attachmentId, `Attachment content missing: ${attachmentId}`, {
        requestId: undefined,
        traceId: undefined,
      });
    }
    return {
      ref,
      content: toReadableStream(content),
    };
  }

  async list(sessionId: string): Promise<readonly AttachmentRef[]> {
    return [...this.attachments.values()].filter((r) => r.sessionId === sessionId);
  }

  async delete(attachmentId: string): Promise<void> {
    if (!this.attachments.has(attachmentId)) {
      throw new AttachmentRefError(attachmentId, `Attachment not found: ${attachmentId}`, {
        requestId: undefined,
        traceId: undefined,
      });
    }
    this.attachments.delete(attachmentId);
    this.contents.delete(attachmentId);
  }

  async exists(attachmentId: string): Promise<boolean> {
    return this.attachments.has(attachmentId);
  }
}

/**
 * Create a default in-memory binary attachment store.
 */
export function createInMemoryBinaryAttachmentStore(): InMemoryBinaryAttachmentStore {
  return new InMemoryBinaryAttachmentStore();
}

/**
 * Convert any binary input to Uint8Array.
 */
async function toBytes(
  content: Buffer | Uint8Array | ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  if (content instanceof Uint8Array) return content;
  if (Buffer.isBuffer(content)) return new Uint8Array(content);
  const chunks: Uint8Array[] = [];
  const reader = content.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Wrap a Uint8Array as a ReadableStream<Uint8Array>.
 */
function toReadableStream(content: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(content);
      controller.close();
    },
  });
}
