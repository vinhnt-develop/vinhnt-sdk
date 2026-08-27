---
title: MCP Integration
description: Connect to MCP servers
lang: en
type: "guide"
category: "Guides"
sidebarPosition: 9
---

# MCP Integration

MCP (Model Context Protocol) allows your agent to connect to external tool servers and extend capabilities beyond built-in tools.

## What is MCP?

MCP is a standardized protocol for communication between AI agents and tool servers. It enables:

- Dynamic tool discovery from external servers
- Resource access (files, databases, APIs)
- Prompt templates from remote providers
- Cross-platform tool interoperability

The protocol supports multiple transport layers including stdio, HTTP, and Server-Sent Events (SSE).

## Configuration

Create an `mcp-servers.json` file in your project root:

```json
{
  "servers": {
    "filesystem": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"],
      "env": {}
    },
    "github": {
      "transport": "http",
      "url": "https://mcp-github.example.com/sse",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    },
    "database": {
      "transport": "stdio",
      "command": "node",
      "args": ["./mcp-servers/db-server.js"],
      "cwd": "./servers"
    }
  }
}
```

## Using McpClientPool

The `McpClientPool` manages multiple MCP server connections:

```typescript
import { McpClientPool } from 'vinhnt-sdk/mcp';

const pool = new McpClientPool();

// Load from config file
await pool.loadFromConfig('mcp-servers.json');

// Or add servers programmatically
await pool.addServer('my-server', {
  transport: 'stdio',
  command: 'npx',
  args: ['-y', 'my-mcp-server']
});

// List connected servers
const servers = pool.getServers();
console.log('Connected:', servers.map(s => s.name));

// Get all available tools from all servers
const tools = await pool.getAllTools();

// Disconnect all
await pool.disconnectAll();
```

## Individual McpClient

For direct connection to a single MCP server:

```typescript
import { McpClient } from 'vinhnt-sdk/mcp';

// Stdio transport
const client = new McpClient({
  name: 'filesystem',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
});

await client.connect();

// List tools
const tools = await client.listTools();
console.log(tools);

// Call a tool
const result = await client.callTool('read_file', {
  path: './README.md'
});

// List resources
const resources = await client.listResources();

// Read a resource
const content = await client.readResource('file:///README.md');

await client.disconnect();
```

## Tool Merging into Kernel

Integrate MCP tools directly into your agent kernel:

```typescript
import { AgentKernel } from 'vinhnt-sdk';
import { McpClientPool } from 'vinhnt-sdk/mcp';

const kernel = new AgentKernel({
  model: 'gpt-4',
  systemPrompt: 'You are a helpful assistant with access to external tools.'
});

const pool = new McpClientPool();
await pool.loadFromConfig('mcp-servers.json');

// Merge MCP tools into kernel
const mcpTools = await pool.getAllTools();
for (const tool of mcpTools) {
  kernel.registerTool({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    execute: async (params) => {
      return await pool.callTool(tool.name, params);
    }
  });
}

// Now the agent can use MCP tools
const response = await kernel.invoke('List files in the current directory');
```

## SSE Transport (Stub)

Server-Sent Events transport for streaming responses:

```typescript
import { McpClient } from 'vinhnt-sdk/mcp';

const client = new McpClient({
  name: 'streaming-server',
  transport: 'sse',
  url: 'https://mcp-server.example.com/sse',
  headers: {
    'Authorization': 'Bearer token123'
  }
});

// SSE provides real-time streaming of tool results
await client.connect();
const stream = await client.streamTool('process_data', { input: 'data' });

for await (const chunk of stream) {
  console.log('Received:', chunk);
}
```

## Streamable HTTP Transport (Stub)

HTTP-based transport with streaming support:

```typescript
const client = new McpClient({
  name: 'http-server',
  transport: 'streamable-http',
  url: 'https://mcp-server.example.com/mcp',
  timeout: 30000
});

await client.connect();

// Supports both request-response and streaming
const result = await client.callTool('query_database', {
  sql: 'SELECT * FROM users LIMIT 10'
});
```

## ACP - Agent Communication Protocol

ACP enables editor integration and inter-agent communication:

```typescript
import { AcpBridge } from 'vinhnt-sdk/acp';

// Connect to VS Code or similar editor
const bridge = new AcpBridge({
  editor: 'vscode',
  port: 3001
});

// Register agent capabilities
bridge.registerCapability('code_review', async (file) => {
  const review = await kernel.invoke(`Review this code: ${file}`);
  return review;
});

// Handle editor events
bridge.onFileSaved(async (filePath) => {
  console.log(`File saved: ${filePath}`);
  await kernel.invoke(`Analyze changes in ${filePath}`);
});

await bridge.start();
```

## Environment Variables

Use environment variables in configuration:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
export DATABASE_URL=postgresql://localhost/mydb
export API_KEY=sk-xxxxxxxxxxxx
```

Reference them in `mcp-servers.json` using `${VAR_NAME}` syntax.

## Error Handling

```typescript
import { McpClient, McpError } from 'vinhnt-sdk/mcp';

try {
  const client = new McpClient(config);
  await client.connect();
} catch (error) {
  if (error instanceof McpError) {
    console.error('MCP Error:', error.code, error.message);
  }
}
```

## Best Practices

- Use environment variables for secrets
- Implement connection retry logic
- Monitor server health with periodic pings
- Gracefully handle server disconnections
- Use pooling for multiple server connections