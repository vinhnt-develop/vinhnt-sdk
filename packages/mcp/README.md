# @vinhnt-sdk/mcp

> Status: stable (MCP 2026-07-28)

Model Context Protocol (MCP) client for vinhnt-sdk — stateless by default, MRTR, tools-first interface.

## Install

```bash
npm install @vinhnt-sdk/mcp
# or
pnpm add @vinhnt-sdk/mcp
```

## Quick Start

```typescript
import { McpClient } from "@vinhnt-sdk/mcp";

const client = new McpClient();
const conn = await client.connect({
  name: "my-server",
  transport: "stdio",
  command: "node",
  args: ["server.js"],
  protocolVersion: "2026-07-28", // default
});

const tools = await conn.listTools();
const result = await conn.callTool("get_weather", { city: "Hanoi" });

await conn.close();
```

## What's new in MCP 2026-07-28

- **Stateless by default** — no session tracking
- **MRTR** (Model-Relative Tool Registration) replaces server-initiated requests
- **Resources and Prompts** are tools (unified interface)
- **Sampling and Roots** are deprecated (use tool calls instead)

## A2A v1.0 interop (discovery)

Agent-to-agent discovery per A2A v1.0 (Linux Foundation): Agent Card types,
`/.well-known/agent-card.json` fetch with ETag/304 caching, and the strict
7-state task lifecycle. Streaming/push-notification bindings are not yet
implemented (deferred).

```typescript
import { discoverAgentCard, KNOWN_TASK_STATES } from "@vinhnt-sdk/mcp";
import type { AgentCard, TaskState } from "@vinhnt-sdk/mcp";

const { card, etag, notModified } = await discoverAgentCard(
  "https://agent.example.com/", // → /.well-known/agent-card.json
);
if (notModified) {
  // reuse cached card (304)
} else {
  console.log(card?.name, card?.skills);
}
const state: TaskState = "TASK_STATE_WORKING";
```

## API Reference

Full export list, types, and examples: [docs/api/mcp.en.md](../../docs/api/mcp.en.md) · [docs/api/mcp.vi.md](../../docs/api/mcp.vi.md)

### Key exports

| Export | Kind | Description |
|--------|------|-------------|
| `McpClient` | class | Connect to MCP servers; list/call tools |
| `McpClientPool` | class | Pool of clients with retry and load balancing |
| `McpServerConfig` | type | Server config: transport, command, args, protocol version |
| `McpTool` | type | Tool definition discovered from a server |
| `discoverAgentCard` | function | A2A v1.0 Agent Card discovery with ETag/304 caching |
| `AgentCard` | type | A2A v1.0 canonical Agent Card data model |
| `TaskState` | type | A2A task lifecycle (7 strict states) |

## Dependencies

- `@vinhnt-sdk/schema`
- `@vinhnt-sdk/tools` (workspace)

## License

MIT
