import { randomBytes, scrypt as scryptCallback } from "node:crypto";

// Better Auth's default scrypt parameters (from @better-auth/utils).
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 16;
const SCRYPT_P = 1;

// Legacy parameters used by `prisma/seed.ts` and existing seeded rows. Kept so
// pre-migration accounts can still sign in after the Better Auth backfill.
const LEGACY_SCRYPT_R = 8;

const HASH_PATTERN = /^([0-9a-f]+):([0-9a-f]+)$/;

const deriveKey = (
  password: string,
  salt: string,
  r: number,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEY_BYTES,
      { N: SCRYPT_N, r, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });

/** Hash a password in Better Auth's `salt:hash` scrypt format. */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = await deriveKey(password, salt, SCRYPT_R);
  return `${salt}:${derivedKey.toString("hex")}`;
};

/**
 * Verify a stored hash against a password. Better Auth's format (r = 16) is
 * tried first, then the legacy seed format (r = 8) — both share the same
 * `salt:hex` layout, only the cost parameter differs.
 */
export const verifyPassword = async (params: {
  password: string;
  hash: string;
}): Promise<boolean> => {
  const parsed = HASH_PATTERN.exec(params.hash);
  if (!parsed) return false;

  const [, salt, expected] = parsed;
  if (!salt || !expected) return false;

  const current = (await deriveKey(params.password, salt, SCRYPT_R)).toString("hex");
  if (timingSafeEqualHex(current, expected)) return true;

  const legacy = (await deriveKey(params.password, salt, LEGACY_SCRYPT_R)).toString("hex");
  return timingSafeEqualHex(legacy, expected);
};

/** Constant-time comparison of two hex strings of equal length. */
const timingSafeEqualHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};
