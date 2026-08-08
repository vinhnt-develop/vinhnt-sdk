# Configuration

> How to configure vinhnt-sdk projects.

---

## Config File Locations

vinhnt-sdk looks for configuration in the following locations (in order of priority):

1. `vnt.config.json` — Project root
2. `vnt.config.jsonc` — Project root (JSONC with comments)
3. `vnt.config.yaml` — Project root
4. `.vnt/config.json` — `.vnt` directory
5. `.vnt/config.yaml` — `.vnt` directory
6. `package.json#vnt` — package.json field

## Basic Configuration

```jsonc
{
  // Model provider configuration
  "provider": {
    "type": "openai",
    "model": "gpt-4o",
    "apiKey": "${OPENAI_API_KEY}"  // Environment variable interpolation
  },

  // Agent behavior
  "agent": {
    "maxSteps": 50,
    "maxTokens": 128000,
    "systemPrompt": "You are a helpful coding assistant."
  },

  // Tool permissions
  "permissions": {
    "rules": [
      { "pattern": "read_file", "effect": "allow" },
      { "pattern": "write_file", "effect": "ask" },
      { "pattern": "execute_*", "effect": "deny" }
    ]
  },

  // Learning and memory
  "learning": {
    "enabled": true,
    "maxMemoryEntries": 1000
  },

  // Context compaction
  "compaction": {
    "enabled": true,
    "threshold": 0.8
  }
}
```

## Environment Variables

Environment variables are interpolated with `${VAR_NAME}` syntax:

```jsonc
{
  "provider": {
    "apiKey": "${OPENAI_API_KEY}"
  }
}
```

You can also use a `.env` file:

```bash
# .env
OPENAI_API_KEY=sk-...
VNT_API_TOKEN=your-token
DATABASE_URL=postgresql://...
```

## Configuration Precedence

Configuration is merged from multiple sources with the following precedence (highest first):

1. **CLI arguments** — `--model gpt-4o`
2. **Environment variables** — `VNT_MODEL=gpt-4o`
3. **Project config** — `vnt.config.json`
4. **User config** — `~/.config/vnt/config.json`
5. **Defaults** — Built-in defaults

## Loading Configuration Programmatically

```typescript
import { loadConfig, resolveConfig } from "@vinhnt-sdk/config";

// Load from file system
const rawConfig = await loadConfig();

// Resolve with defaults and environment
const config = resolveConfig(rawConfig);

console.log(config.provider.type);  // "openai"
console.log(config.agent.maxSteps); // 50
```

## Watching for Changes

```typescript
import { createConfigWatcher } from "@vinhnt-sdk/config";

const watcher = createConfigWatcher("./vnt.config.json", (newConfig) => {
  console.log("Config changed:", newConfig);
});

// Stop watching
watcher.close();
```

## Schema Generation

Generate JSON Schema from config definition:

```typescript
import { buildVntJsonSchema } from "@vinhnt-sdk/config";

const schema = buildVntJsonSchema();
// Use with JSON Schema validators, IDE autocomplete, etc.
```
