# Environment Variables

vinhnt-sdk reads configuration from environment variables. No hardcoded values.

## LLM Provider Keys

```bash
# DeepSeek (recommended for cost-efficiency)
DEEPSEEK_API_KEY=sk-...

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Ollama (local, no key needed)
OLLAMA_BASE_URL=http://localhost:11434
```

## Runtime Configuration

```bash
# Logging
VNT_LOG_LEVEL=info              # debug | info | warn | error

# Sandbox
VNT_SANDBOX_TIMEOUT=30000       # Tool execution timeout (ms)
VNT_SANDBOX_WORKSPACE=/path     # Workspace root

# Session
VNT_SESSION_TTL=3600            # Session TTL (seconds)

# Tracing
VNT_TRACE_ENABLED=true          # Enable OpenTelemetry
VNT_TRACE_ENDPOINT=http://...   # OTLP endpoint
```

## Credential Resolution Order

Credentials are resolved in 4 layers (highest priority first):

1. **Process environment** — `process.env.MY_KEY`
2. **Managed store** — Programmatic credential store
3. **Project `.env`** — `.env` file in project root
4. **User `.env`** — `~/.env` file

```typescript
import { resolveCredentialMultiLayer } from "@vinhnt-sdk/config";

const credential = resolveCredentialMultiLayer(
  {
    processEnv: resolveEnv(process.env),
    managedStore: myStore,
    projectEnv: readFileSync(".env", "utf-8"),
    userEnv: readFileSync("~/.env", "utf-8"),
  },
  credentialRef("DEEPSEEK_API_KEY"),
);
```
