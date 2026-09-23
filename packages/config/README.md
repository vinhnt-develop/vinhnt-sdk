# @vinhnt-sdk/config

> Version: 0.4.2 | Status: stable

Credential resolution, settings, and env validation for vinhnt-sdk — zero hardcoded secrets via 4-layer credential resolution.

## Install

```bash
npm install @vinhnt-sdk/config
# or
pnpm add @vinhnt-sdk/config
```

## Quick Start

```typescript
import {
  resolveEnv,
  parseEnvFile,
  resolveCredentialMultiLayer,
  credentialRef,
} from "@vinhnt-sdk/config";
import { readFileSync } from "fs";

const snapshot = resolveEnv(process.env);
const envFile = parseEnvFile(readFileSync(".env", "utf-8"));

const cred = resolveCredentialMultiLayer(
  {
    explicit: {},
    processEnv: true,
    envFile,
    defaults: {},
  },
  credentialRef("OPENAI_API_KEY"),
);
// { source: "env", key: "OPENAI_API_KEY", value: "sk-..." }
```

## API Reference

Full export list, types, and examples: [docs/api/config.en.md](../../docs/api/config.en.md) · [docs/api/config.vi.md](../../docs/api/config.vi.md)

### Key exports

| Export | Kind | Description |
|--------|------|-------------|
| `resolveEnv` | function | Build an `EnvSnapshot` from a key-value record |
| `parseEnvFile` | function | Parse `.env` content into a record |
| `resolveCredentialFromEnv` | function | Resolve a credential from an env snapshot |
| `resolveCredentialMultiLayer` | function | 4-layer resolution (explicit → process env → env file → default) |
| `credentialRef` | function | Create a branded `CredentialRef` |
| `settingsNamespace` | function | Create a branded `SettingsNamespace` |
| `CredentialRef` | type | Branded reference to a secret |
| `SettingsSection` | type | Settings layer: `default` \| `composition` \| `user` |

## Dependencies

- `@vinhnt-sdk/schema`

## License

MIT
