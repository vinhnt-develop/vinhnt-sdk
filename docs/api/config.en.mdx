---
title: "@vinhnt-sdk/config"
description: "Credentials, env resolution, settings"
lang: "en"
version: "0.1.3"
type: "reference"
category: "API Reference"
sidebarLabel: "config"
---

## Installation

```bash
npm install @vinhnt-sdk/config
```

## Exports

### Functions

#### `resolveEnv(env: Record<string, string>): EnvSnapshot`

Creates an `EnvSnapshot` from a key-value record.

```typescript
const snapshot = resolveEnv({
  OPENAI_API_KEY: "sk-...",
  ANTHROPIC_API_KEY: "sk-ant-...",
});
```

#### `parseEnvFile(content: string): Record<string, string>`

Parses a `.env` file content into a key-value record.

```typescript
import { readFileSync } from "fs";
const content = readFileSync(".env", "utf-8");
const env = parseEnvFile(content);
```

#### `resolveCredentialFromEnv(env: EnvSnapshot, ref: CredentialRef): ResolvedCredential`

Resolves a single credential reference from an environment snapshot.

```typescript
const cred = resolveCredentialFromEnv(snapshot, credentialRef("OPENAI_API_KEY"));
// { source: "env", key: "OPENAI_API_KEY", value: "sk-..." }
```

#### `resolveCredentialMultiLayer(config: MultiLayerEnvConfig, ref: CredentialRef): ResolvedCredential`

Resolves a credential using a 4-layer resolution strategy:

1. **Explicit override** — direct value in config
2. **Process env** — `process.env[key]`
3. **Env file** — `.env` file values
4. **Default** — fallback default value

```typescript
const config: MultiLayerEnvConfig = {
  explicit: { OPENAI_API_KEY: "sk-explicit" },
  processEnv: true,
  envFile: parseEnvFile(readFileSync(".env", "utf-8")),
  defaults: { OPENAI_API_KEY: "sk-fallback" },
};

const cred = resolveCredentialMultiLayer(config, credentialRef("OPENAI_API_KEY"));
```

#### `credentialRef(str: string): CredentialRef`

Creates a branded `CredentialRef` from a string.

```typescript
const ref = credentialRef("OPENAI_API_KEY");
```

#### `settingsNamespace(str: string): SettingsNamespace`

Creates a branded `SettingsNamespace` from a string.

```typescript
const ns = settingsNamespace("myapp");
```

#### `mergeLayers(base: SettingsSection, override: SettingsSection): SettingsSection`

Deep-merges two settings sections, with `override` taking precedence.

```typescript
const merged = mergeLayers(
  { theme: "dark", language: "en" },
  { theme: "light" }
);
// { theme: "light", language: "en" }
```

### Constants

```typescript
const KNOWN_CREDENTIAL_SOURCES = ["env", "file", "keychain", "vault"] as const;
type CredentialSource = (typeof KNOWN_CREDENTIAL_SOURCES)[number];
```

### Types

```typescript
interface EnvSnapshot {
  readonly data: ReadonlyMap<string, string>;
  get(key: string): string | undefined;
  has(key: string): boolean;
}

interface CredentialRef {
  readonly __brand: "CredentialRef";
  readonly key: string;
}

interface ResolvedCredential {
  source: CredentialSource;
  key: string;
  value: string;
}

interface MultiLayerEnvConfig {
  explicit?: Record<string, string>;
  processEnv?: boolean;
  envFile?: Record<string, string>;
  defaults?: Record<string, string>;
}

interface SettingsNamespace {
  readonly __brand: "SettingsNamespace";
  readonly value: string;
}

interface SettingsSection {
  [key: string]: unknown;
}

interface SettingsProvider {
  namespace: SettingsNamespace;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  getAll(): SettingsSection;
}

interface SettingsSchema {
  namespace: SettingsNamespace;
  schema: import("zod").ZodType;
  defaults: SettingsSection;
}
```

## Usage Examples

```typescript
import {
  resolveEnv, parseEnvFile, resolveCredentialMultiLayer,
  credentialRef, settingsNamespace, mergeLayers,
} from "@vinhnt-sdk/config";

// Full credential resolution
const env = resolveEnv(process.env as Record<string, string>);
const config: MultiLayerEnvConfig = {
  processEnv: true,
  envFile: parseEnvFile(readFileSync(".env", "utf-8")),
  defaults: { OPENAI_API_KEY: "sk-default" },
};

const apiKey = resolveCredentialMultiLayer(config, credentialRef("OPENAI_API_KEY"));
console.log(apiKey.value);

// Settings with namespace
const ns = settingsNamespace("myapp");
```

## Error Handling

```typescript
import { ConfigError } from "@vinhnt-sdk/schema";

try {
  const cred = resolveCredentialMultiLayer(config, ref);
  if (!cred.value) {
    throw new ConfigError(`Missing credential: ${ref.key}`);
  }
} catch (e) {
  if (e instanceof ConfigError) {
    console.error("Configuration error:", e.message);
  }
}
```

## Dependencies

- `@vinhnt-sdk/schema` — branded types and error classes
