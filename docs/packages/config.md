# @vinhnt-sdk/config

> Typed configuration, validation, file watching, and schema generation.

**npm:** `npm install @vinhnt-sdk/config`  
**Size:** ~45 KB  
**Dependencies:** `zod`, `js-yaml` (no internal dependencies)

---

## Overview

`config` handles all configuration concerns:

- Load config from files (JSON, JSONC, YAML)
- Validate against typed schemas
- Merge from multiple sources (file, env, CLI)
- Watch for changes
- Generate JSON Schema

## Installation

```bash
npm install @vinhnt-sdk/config
```

## Exports

### Loading Config

```typescript
import { loadConfig, resolveConfig } from "@vinhnt-sdk/config";

// Load from file system (searches multiple locations)
const rawConfig = await loadConfig();

// Resolve with defaults and environment variables
const config = resolveConfig(rawConfig);

console.log(config.provider.type);  // "openai"
```

### Config Schema

```typescript
import type { VntConfig } from "@vinhnt-sdk/config";

// Full config type
const config: VntConfig = {
  provider: {
    type: "openai",
    model: "gpt-4o",
    apiKey: "${OPENAI_API_KEY}",
  },
  agent: {
    maxSteps: 50,
    maxTokens: 128000,
  },
  permissions: {
    rules: [
      { pattern: "read_*", effect: "allow" },
    ],
  },
  learning: {
    enabled: true,
  },
};
```

### Validation

```typescript
import { validateConfig } from "@vinhnt-sdk/config";

const errors = validateConfig(rawConfig);
if (errors.length > 0) {
  console.error("Invalid config:", errors);
}
```

### Parsing

```typescript
import { parseJsonc, parseYaml, isYamlFile } from "@vinhnt-sdk/config";

// Parse JSONC (JSON with comments)
const config = parseJsonc(`
  {
    // This is a comment
    "provider": {
      "type": "openai"
    }
  }
`);

// Parse YAML
const yamlConfig = parseYaml(`
  provider:
    type: openai
`);

// Check file type
isYamlFile("config.yaml"); // true
isYamlFile("config.json"); // false
```

### Merging

```typescript
import { mergeConfig, deepMerge } from "@vinhnt-sdk/config";

// Merge multiple config sources
const merged = mergeConfig(defaults, fileConfig, envConfig, cliConfig);

// Deep merge objects
const merged = deepMerge(obj1, obj2);
```

### Environment Variables

```typescript
import { EnvConfigSource, loadEnvFile } from "@vinhnt-sdk/config";

// Load .env file
await loadEnvFile("./.env");

// Create env config source
const envSource = new EnvConfigSource();
const config = envSource.load();
```

### File Watching

```typescript
import { createConfigWatcher } from "@vinhnt-sdk/config";

const watcher = createConfigWatcher("./vnt.config.json", (newConfig) => {
  console.log("Config updated:", newConfig);
});

// Cleanup
watcher.close();
```

### Project Detection

```typescript
import { detectProjectLayout, hasVntInfrastructure } from "@vinhnt-sdk/config";

const layout = detectProjectLayout();
console.log(layout.hasPackageJson);   // true
console.log(layout.hasTsConfig);      // true
console.log(layout.configFiles);      // ["vnt.config.json"]

const hasInfra = hasVntInfrastructure();
console.log(hasInfra); // true if .vnt/ exists
```

### Schema Generation

```typescript
import { buildVntJsonSchema, CONFIG_GROUPS } from "@vinhnt-sdk/config";

// Generate JSON Schema from config definition
const schema = buildVntJsonSchema();

// List config groups
console.log(CONFIG_GROUPS);
// [{ id: "provider", label: "Provider" }, ...]
```

### Migration

```typescript
import { MigrationRegistry, createDefaultMigrationRegistry } from "@vinhnt-sdk/config";

const migrations = createDefaultMigrationRegistry();
const migrated = migrations.migrate(oldConfig, "0.0.1", "0.1.0");
```
