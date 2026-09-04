/**
 * File-based credential provider — stores credentials in a local JSON file.
 *
 * Credentials are stored in `.vnt/.credentials.json` with file permissions
 * restricted to owner-only (0600 on Unix). Supports optional AES-256-GCM
 * encryption via `encryptionKey`.
 *
 * @example
 * ```ts
 * import { FileCredentialProvider } from "@vinhnt-sdk/config";
 *
 * const provider = new FileCredentialProvider({
 *   credentialsDir: ".vnt",
 * });
 *
 * // Set a credential (encrypted if key provided)
 * await provider.set(credentialRef("DEEPSEEK_API_KEY"), "sk-...");
 *
 * // Resolve it back
 * const cred = await provider.resolve(credentialRef("DEEPSEEK_API_KEY"));
 * ```
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type {
  CredentialRef,
  CredentialProvider,
  CredentialInfo,
  ResolvedCredential,
} from "./credentials.js";

// ── Types ──

export interface FileCredentialProviderOptions {
  /** Directory containing `.credentials.json`. Default: `.vnt` */
  credentialsDir?: string;
  /** Filename within credentialsDir. Default: `.credentials.json` */
  filename?: string;
  /** AES-256-GCM encryption key (32 bytes). If provided, values are encrypted at rest. */
  encryptionKey?: string | Buffer;
  /** Whether to enforce 0600 file permissions on Unix. Default: true */
  enforcePermissions?: boolean;
}

interface CredentialRecord {
  /** The encrypted or plaintext value. */
  value: string;
  /** Whether the value is encrypted. */
  encrypted: boolean;
  /** ISO-8601 timestamp. */
  updatedAt: string;
}

interface CredentialsFile {
  version: 1;
  records: Record<string, CredentialRecord>;
}

// ── Encryption ──

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function deriveKey(input: string | Buffer): Buffer {
  if (Buffer.isBuffer(input) && input.length === 32) return input;
  // Derive a 32-byte key from string input using SHA-256
  return crypto.createHash("sha256").update(input).digest();
}

function encryptValue(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptValue(ciphertext: string, key: Buffer): string {
  const [ivHex, authTagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Invalid encrypted credential format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// ── File Operations ──

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function restrictPermissions(filePath: string): void {
  try {
    if (process.platform !== "win32") {
      fs.chmodSync(filePath, 0o600);
    }
  } catch {
    // Ignore permission errors on platforms that don't support chmod
  }
}

// ── FileCredentialProvider ──

export class FileCredentialProvider implements CredentialProvider {
  private readonly filePath: string;
  private readonly encryptionKey: Buffer | undefined;
  private readonly enforcePermissions: boolean;
  private cache: CredentialsFile | undefined;

  constructor(options?: FileCredentialProviderOptions) {
    const dir = options?.credentialsDir ?? ".vnt";
    const filename = options?.filename ?? ".credentials.json";
    this.filePath = path.resolve(dir, filename);
    this.encryptionKey = options?.encryptionKey
      ? deriveKey(options.encryptionKey)
      : undefined;
    this.enforcePermissions = options?.enforcePermissions ?? true;
  }

  /** Load the credentials file from disk (cached). */
  private load(): CredentialsFile {
    if (this.cache) return this.cache;

    if (!fs.existsSync(this.filePath)) {
      this.cache = { version: 1, records: {} };
      return this.cache;
    }

    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as CredentialsFile;
      this.cache = { version: 1, records: parsed.records ?? {} };
    } catch {
      this.cache = { version: 1, records: {} };
    }

    return this.cache;
  }

  /** Save the credentials file to disk. */
  private save(data: CredentialsFile): void {
    const dir = path.dirname(this.filePath);
    ensureDir(dir);

    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(this.filePath, content, "utf8");

    if (this.enforcePermissions) {
      restrictPermissions(this.filePath);
    }

    this.cache = data;
  }

  /** Invalidate cache so next read goes to disk. */
  invalidateCache(): void {
    this.cache = undefined;
  }

  async resolve(ref: CredentialRef): Promise<ResolvedCredential | undefined> {
    // 1. Check process environment first (always wins)
    const envValue = process.env[ref];
    if (envValue !== undefined) {
      return { value: envValue, source: "env" };
    }

    // 2. Check managed file store
    const data = this.load();
    const record = data.records[ref];
    if (!record) return undefined;

    let value = record.value;
    if (record.encrypted && this.encryptionKey) {
      try {
        value = decryptValue(value, this.encryptionKey);
      } catch {
        return undefined;
      }
    } else if (record.encrypted && !this.encryptionKey) {
      // Encrypted but no key — can't decrypt
      return undefined;
    }

    return { value, source: "managed" };
  }

  async describe(ref: CredentialRef): Promise<CredentialInfo> {
    const envValue = process.env[ref];
    if (envValue !== undefined) {
      return { configured: true, source: "env", writable: false };
    }

    const data = this.load();
    const record = data.records[ref];
    if (!record) {
      return { configured: false, source: undefined, writable: true };
    }

    return { configured: true, source: "managed", writable: true };
  }

  async set(ref: CredentialRef, value: string): Promise<void> {
    // Check if shadowed by env
    if (process.env[ref] !== undefined) {
      throw new Error(
        `Cannot set credential "${ref}": shadowed by process environment variable`,
      );
    }

    const data = this.load();
    let storedValue = value;
    let encrypted = false;

    if (this.encryptionKey) {
      storedValue = encryptValue(value, this.encryptionKey);
      encrypted = true;
    }

    data.records[ref] = {
      value: storedValue,
      encrypted,
      updatedAt: new Date().toISOString(),
    };

    this.save(data);
  }

  async unset(ref: CredentialRef): Promise<void> {
    if (process.env[ref] !== undefined) {
      throw new Error(
        `Cannot unset credential "${ref}": shadowed by process environment variable`,
      );
    }

    const data = this.load();
    delete data.records[ref];
    this.save(data);
  }

  /** List all stored credential references (metadata only, no values). */
  list(): Array<{ ref: CredentialRef; updatedAt: string }> {
    const data = this.load();
    return Object.entries(data.records).map(([key, record]) => ({
      ref: key as CredentialRef,
      updatedAt: record.updatedAt,
    }));
  }
}
