---
title: "@vinhnt-sdk/config"
description: "Thông tin xác thực, phân giải môi trường, cài đặt"
lang: "vi"
version: "0.1.3"
type: "reference"
category: "API Reference"
sidebarLabel: "config"
---

## Cài đặt

```bash
npm install @vinhnt-sdk/config
```

## Xuất (Exports)

### Hàm

#### `resolveEnv(env: Record<string, string>): EnvSnapshot`

Tạo `EnvSnapshot` từ bản ghi key-value.

```typescript
const snapshot = resolveEnv({
  OPENAI_API_KEY: "sk-...",
  ANTHROPIC_API_KEY: "sk-ant-...",
});
```

#### `parseEnvFile(content: string): Record<string, string>`

Phân tích nội dung file `.env` thành bản ghi key-value.

```typescript
import { readFileSync } from "fs";
const content = readFileSync(".env", "utf-8");
const env = parseEnvFile(content);
```

#### `resolveCredentialFromEnv(env: EnvSnapshot, ref: CredentialRef): ResolvedCredential`

Phân giải một tham chiếu xác thực từ snapshot môi trường.

```typescript
const cred = resolveCredentialFromEnv(snapshot, credentialRef("OPENAI_API_KEY"));
// { source: "env", key: "OPENAI_API_KEY", value: "sk-..." }
```

#### `resolveCredentialMultiLayer(config: MultiLayerEnvConfig, ref: CredentialRef): ResolvedCredential`

Phân giải xác thực bằng chiến lược 4 lớp:

1. **Ghi đè rõ ràng** — giá trị trực tiếp trong config
2. **Process env** — `process.env[key]`
3. **Env file** — giá trị từ file `.env`
4. **Mặc định** — giá trị dự phòng

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

Tạo `CredentialRef` được đóng gói từ chuỗi.

```typescript
const ref = credentialRef("OPENAI_API_KEY");
```

#### `settingsNamespace(str: string): SettingsNamespace`

Tạo `SettingsNamespace` được đóng gói từ chuỗi.

```typescript
const ns = settingsNamespace("myapp");
```

#### `mergeLayers(base: SettingsSection, override: SettingsSection): SettingsSection`

Hợp nhất sâu hai phần cài đặt, `override` có ưu tiên cao hơn.

```typescript
const merged = mergeLayers(
  { theme: "dark", language: "en" },
  { theme: "light" }
);
// { theme: "light", language: "en" }
```

### Hằng số

```typescript
const KNOWN_CREDENTIAL_SOURCES = ["env", "file", "keychain", "vault"] as const;
type CredentialSource = (typeof KNOWN_CREDENTIAL_SOURCES)[number];
```

### Kiểu

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

## Ví dụ sử dụng

```typescript
import {
  resolveEnv, parseEnvFile, resolveCredentialMultiLayer,
  credentialRef, settingsNamespace, mergeLayers,
} from "@vinhnt-sdk/config";

// Phân giải đầy đủ thông tin xác thực
const env = resolveEnv(process.env as Record<string, string>);
const config: MultiLayerEnvConfig = {
  processEnv: true,
  envFile: parseEnvFile(readFileSync(".env", "utf-8")),
  defaults: { OPENAI_API_KEY: "sk-default" },
};

const apiKey = resolveCredentialMultiLayer(config, credentialRef("OPENAI_API_KEY"));
console.log(apiKey.value);

// Cài đặt với namespace
const ns = settingsNamespace("myapp");
```

## Xử lý lỗi

```typescript
import { ConfigError } from "@vinhnt-sdk/schema";

try {
  const cred = resolveCredentialMultiLayer(config, ref);
  if (!cred.value) {
    throw new ConfigError(`Thiếu xác thực: ${ref.key}`);
  }
} catch (e) {
  if (e instanceof ConfigError) {
    console.error("Lỗi cấu hình:", e.message);
  }
}
```

## Phụ thuộc

- `@vinhnt-sdk/schema` — kiểu được đóng gói và lớp lỗi
