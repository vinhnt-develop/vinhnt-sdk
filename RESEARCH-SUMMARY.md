# Key Findings Summary: Anthropic Agent Patterns Research

## TL;DR - What Matters Most for vinhnt-sdk

### 1. Core Architecture Patterns
| Pattern | Anthropic Approach | vinhnt-sdk Adoption |
|---------|-------------------|---------------------|
| Type System | Discriminated unions on `type` field | ✅ Use for all polymorphic types |
| Streaming | Async generator + event emitter dual API | ✅ Implement both patterns |
| Tools | Zod schemas with `tool()` helper | ✅ Type-safe tool definitions |
| Caching | TTL-based with auto/explicit modes | ✅ Support both modes |
| Errors | HTTP-mapped class hierarchy | ✅ Rich error classes |

### 2. Critical Type Patterns
```typescript
// 1. Discriminated Unions (EVERYWHERE)
type ContentBlock = 
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "thinking"; thinking: string; signature: string };

// 2. Param vs Response Split
interface TextBlockParam { type: "text"; text: string; cache_control?: CacheControlEphemeral; }
interface TextBlock { type: "text"; text: string; citations?: Array<TextCitation>; }

// 3. Nullable Handling
field?: string;      // Optional (undefined)
field: string | null; // Nullable (null)
field?: string | null; // Both
```

### 3. Streaming Architecture
```typescript
// Dual API pattern
class MessageStream {
  // Async iterator (primary)
  [Symbol.asyncIterator](): AsyncIterator<StreamEvent>;
  
  // Event emitter (secondary)
  on(event: "text", handler: (delta: string) => void): void;
  on(event: "tool_use", handler: (tool: ToolUseBlock) => void): void;
  
  // Convenience
  text_stream: AsyncGenerator<string>;
  async finalMessage(): Promise<Message>;
}
```

### 4. Tool System
```typescript
// Tool definition with Zod
const searchTool = tool(
  "search",
  "Search the web",
  { query: z.string() },
  async ({ query }) => ({ content: [{ type: "text", text: `Results: ${query}` }] })
);

// Tool choice
type ToolChoice = 
  | { type: "auto" }
  | { type: "any" }
  | { type: "tool"; name: string }
  | { type: "none" };
```

### 5. Cache Control
```typescript
// Automatic caching (top-level)
{
  model: "claude-opus-5",
  cache_control: { type: "ephemeral" },  // Auto-cache last block
}

// Explicit caching (block-level)
{
  cache_control: { type: "ephemeral", ttl: "1h" }  // 1-hour TTL
}

// Usage tracking
{
  cache_creation_input_tokens: 148,
  cache_read_input_tokens: 1800,
  cache_creation: {
    ephemeral_5m_input_tokens: 148,
    ephemeral_1h_input_tokens: 100
  }
}
```

### 6. Error Hierarchy
```
AnthropicError
├── APIConnectionError
│   └── APIConnectionTimeoutError
├── APIUserAbortError
├── APIError (HTTP errors)
│   ├── BadRequestError (400)
│   ├── AuthenticationError (401)
│   ├── PermissionDeniedError (403)
│   ├── NotFoundError (404)
│   ├── ConflictError (409)
│   ├── UnprocessableEntityError (422)
│   ├── RateLimitError (429)
│   ├── InternalServerError (500)
│   └── OverloadedError (529)
└── RetryableError
```

### 7. A2A Protocol Concepts
```typescript
// Agent Card (discovery)
interface AgentCard {
  name: string;
  description: string;
  url: string;
  capabilities: { streaming: boolean; pushNotifications: boolean };
  skills: Array<Skill>;
}

// Task lifecycle
type TaskState = "submitted" | "working" | "input-required" | "completed" | "failed";

// Message parts
interface Part {
  type: "text" | "file" | "data";
  text?: string;
}
```

---

## Priority Implementation Order for vinhnt-sdk

### Phase 1: Core Types
1. Content block discriminated unions
2. Param/Response type split
3. Error hierarchy
4. Usage/cache tracking

### Phase 2: Streaming
1. Async generator pattern
2. Event emitter pattern
3. Text stream convenience
4. Final message accumulation

### Phase 3: Tools
1. Zod schema integration
2. Tool choice configuration
3. Deferred loading support
4. Server-side tool execution

### Phase 4: Caching
1. TTL-based cache control
2. Auto/explicit breakpoint modes
3. Cache usage tracking
4. Pre-warming support

### Phase 5: Agent Protocol
1. Agent Cards for discovery
2. Task lifecycle state machine
3. MCP tool integration
4. A2A message protocol

---

*Key insight: Anthropic's type system is the foundation - get discriminated unions and param/response split right, everything else builds on that.*
