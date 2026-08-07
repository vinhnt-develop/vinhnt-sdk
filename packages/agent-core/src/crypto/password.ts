import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SALT_LEN = 32;
const KEY_LEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 } as const;

/**
 * Hash a password using scrypt with a random salt.
 * Returns `salt:hash` (both hex-encoded).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LEN, SCRYPT_OPTS, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
  return `${salt}:${derived.toString("hex")}`;
}

/**
 * Verify a password against a stored `salt:hash` string.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const sep = stored.indexOf(":");
  if (sep === -1) return false;
  const salt = stored.slice(0, sep);
  const expectedHex = stored.slice(sep + 1);
  const expected = Buffer.from(expectedHex, "hex");

  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LEN, SCRYPT_OPTS, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
