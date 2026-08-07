import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

const TOKEN_DIR = ".vnt/mcp-tokens";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function getEncryptionKey(): Buffer | null {
  const secret = process.env.VNT_TOKEN_ENCRYPTION_KEY;
  if (!secret) return null;
  return deriveKey(secret);
}

function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf-8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(ciphertext: string, key: Buffer): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const iv = Buffer.from(parts[0]!, "hex");
  const authTag = Buffer.from(parts[1]!, "hex");
  const encrypted = parts[2]!;
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

export class McpTokenStore {
  private readonly dir: string;
  private readonly encryptionKey: Buffer | null;

  constructor(dir?: string, encryptionKey?: string) {
    this.dir = resolve(dir ?? TOKEN_DIR);
    this.encryptionKey = encryptionKey ? deriveKey(encryptionKey) : getEncryptionKey();
  }

  private filePath(serverName: string): string {
    return join(this.dir, `${serverName.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
  }

  async save(serverName: string, tokens: OAuthTokens): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const payload = JSON.stringify(tokens);
    const stored = this.encryptionKey ? encrypt(payload, this.encryptionKey) : payload;
    await writeFile(this.filePath(serverName), stored, "utf-8");
  }

  async load(serverName: string): Promise<OAuthTokens | null> {
    const fp = this.filePath(serverName);
    if (!existsSync(fp)) return null;
    try {
      const raw = await readFile(fp, "utf-8");
      const decrypted = this.encryptionKey ? decrypt(raw, this.encryptionKey) : raw;
      return JSON.parse(decrypted) as OAuthTokens;
    } catch {
      return null;
    }
  }

  async delete(serverName: string): Promise<void> {
    const fp = this.filePath(serverName);
    if (existsSync(fp)) {
      const { rm } = await import("node:fs/promises");
      await rm(fp, { force: true });
    }
  }

  isExpired(tokens: OAuthTokens): boolean {
    if (!tokens.expiresAt) return false;
    return Date.now() >= tokens.expiresAt - 60_000;
  }
}
