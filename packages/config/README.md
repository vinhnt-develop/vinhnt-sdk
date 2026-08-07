# @vnt/config

Typed configuration schema, validation, and hierarchical config provider for VNT Agent.

## Install

```bash
# npm
npm install @vnt/config

# pnpm (monorepo)
pnpm add @vnt/config
```

## Quick Start

```typescript
import { loadConfig, validateConfig, resolveConfig } from '@vnt/config';

const config = await loadConfig(process.cwd());
const validated = validateConfig(config);
const resolved = resolveConfig(validated, { apiKey: process.env.API_KEY });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `loadConfig` | Function | Load config from file system (JSON/JSONC/YAML) |
| `validateConfig` | Function | Validate config against Zod schema |
| `resolveConfig` | Function | Resolve `{env:VAR}` and `{file:path}` placeholders |
| `mergeConfig`, `deepMerge` | Function | Merge multiple config sources |
| `CONFIG_GROUPS` | Const | UI metadata for 20 config groups |
| `buildVntConfigSchema` | Function | Generate Zod schema from definition |
| `buildVntJsonSchema` | Function | Generate JSON Schema for IDE support |
| `createConfigWatcher` | Function | Watch config file changes with hot-reload |
| `EnvConfigSource` | Class | Environment variable config source |
| `loadEnvFile`, `findEnvFile`, `ensureVntApiToken` | Function | `.env` file utilities |
| `MigrationRegistry` | Class | Config schema migration support |

## Subpath Imports

```typescript
import { loadConfig } from '@vnt/config';          // main
import { CONFIG_GROUPS } from '@vnt/config/definition'; // deep import
```

## License

MIT
