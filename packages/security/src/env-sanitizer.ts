/**
 * Environment sanitization for sandboxed / shell child processes.
 *
 * Only a safe whitelist of non-secret variables survives; credentials
 * (AWS/GitHub/GitLab tokens, DATABASE_URL, private keys, …) are never
 * forwarded to subprocesses.
 *
 * @module security/env-sanitizer
 */

const SENSITIVE_ENV_PREFIXES = [
  "AWS_",
  "GOOGLE_",
  "AZURE_",
  "GITHUB_",
  "GITLAB_",
  "npm_",
  "NODE_",
] as const;

const SENSITIVE_ENV_KEYS = new Set([
  "HOME",
  "USER",
  "USERNAME",
  "PASSWORD",
  "SECRET",
  "TOKEN",
  "API_KEY",
  "APIKEY",
  "PRIVATE_KEY",
  "DATABASE_URL",
  "DB_URL",
  "REDIS_URL",
]);

/**
 * Whitelist of environment variables safe to expose to child processes.
 */
const SAFE_ENV_WHITELIST = new Set([
  "PATH",
  "PATHEXT",
  "SYSTEMDRIVE",
  "SYSTEMROOT",
  "SystemRoot",
  "windir",
  "COMSPEC",
  "TEMP",
  "TMP",
  "TMPDIR",
  "LANG",
  "LC_ALL",
  "LC_COLLATE",
  "LC_CTYPE",
  "LC_MESSAGES",
  "LC_MONETARY",
  "LC_NUMERIC",
  "LC_TIME",
  "PWD",
  "OLDPWD",
  "SHELL",
  "TERM",
  "TERMINFO",
  "COLORTERM",
  "TZ",
  "EDITOR",
  "VISUAL",
  "PAGER",
  "OS",
  "PROCESSOR_ARCHITECTURE",
  "PROCESSOR_IDENTIFIER",
  "PROCESSOR_LEVEL",
  "PROCESSOR_REVISION",
  "NUMBER_OF_PROCESSORS",
  "COMPUTERNAME",
  "USERDOMAIN",
  "USERDOMAIN_ROAMINGPROFILE",
  "SESSIONNAME",
  "LOGONSERVER",
  "NVM_HOME",
  "NVM_SYMLINK",
  "EXEPATH",
  "ProgramFiles",
  "ProgramFiles(x86)",
  "ProgramW6432",
  "APPDATA",
  "LOCALAPPDATA",
  "OneDrive",
]);

/**
 * Build a sanitized environment: only the safe whitelist (plus any explicit
 * `allowedVars`) survives; secrets are never forwarded to child processes.
 *
 * @param source - Source environment (defaults to `process.env`).
 * @param allowedVars - Optional extra non-secret vars to keep.
 */
export function sanitizeEnv(
  source: Record<string, string | undefined> = process.env,
  allowedVars?: string[],
): Record<string, string> {
  const safe: Record<string, string> = {};
  const allowed = new Set(allowedVars ?? []);
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    const upperKey = key.toUpperCase();
    const isSensitive = SENSITIVE_ENV_PREFIXES.some((p) => upperKey.startsWith(p)) ||
      SENSITIVE_ENV_KEYS.has(upperKey);
    if (isSensitive) continue;
    if (SAFE_ENV_WHITELIST.has(key) || SAFE_ENV_WHITELIST.has(upperKey) || allowed.has(key)) {
      safe[key] = value;
    }
  }
  return safe;
}
