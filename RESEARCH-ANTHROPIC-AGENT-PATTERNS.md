# Deep Research: Anthropic Agent Patterns & Claude Agent SDK

## Comprehensive Architecture & Design Patterns Analysis

---

## 1. Claude Agent SDK Structure

### Architecture
The Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) wraps the Claude Code CLI as a library. It provides:
- **Built-in tools**: Read, Write, Edit, Bash, Grep, Glob (no need to implement tool execution)
- **Agent loop**: Automatic context management, compaction, and tool orchestration
- **Streaming**: Async iterator pattern for real-time message streaming

### TypeScript Usage Pattern
```typescript
import { query, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Core query function - async generator pattern
for await (const message of query({
  prompt: "Find and fix the bug in auth.ts",
  options: {
    allowedTools: ["Read", "Edit", "Bash"],
    maxTurns: 10,
  }
})) {
  if ("result" in message) {
    console.log(message.result);
  }
}

// Custom tool definition with Zod schema
const searchTool = tool(
  "search",
  "Search the web",
  { query: z.string() },
  async ({ query }) => {
    return { content: [{ type: "text", text: `Results for: ${query}` }] };
  }
);
```

### Design Decisions
- **CLI wrapper approach**: SDK bundles native Claude Code binary per platform
- **Plugin system**: Extensible via skills, agents, hooks, MCP servers
- **Settings resolution**: Multi-source config (user, project, local)
- **Session management**: Persistent context across exchanges

### What vinhnt-sdk Can Learn
1. **Agentic loop as async generator** - elegant streaming pattern
2. **Plugin architecture** - hooks, skills, agents as markdown files
3. **Tool registration with Zod schemas** - type-safe tool definitions
4. **Built-in tool execution** - no need for users to implement file operations

---

## 2. Anthropic SDK TypeScript Type Architecture

### Package Structure
```
@anthropic-ai/sdk
├── src/
│   ├── client.ts          # Main Anthropic client
│   ├── resources/
│   │   └── messages/
│   │       └── messages.ts  # All message types (261KB!)
│   ├── lib/
│   │   ├── parser.ts      # Structured output parsing
│   │   ├── MessageStream.ts  # Streaming abstraction
│   │   └── tools/
│   │       └── BetaToolRunner.ts  # Tool execution loop
│   └── core/
│       ├── error.ts       # Error hierarchy
│       ├── streaming.ts   # SSE streaming
│       └── middleware.ts  # Request middleware
```

### Key Type Patterns

#### Discriminated Unions (Content Blocks)
```typescript
// ContentBlockParam - Input side (what you send)
type ContentBlockParam =
  | TextBlockParam
  | ImageBlockParam
  | DocumentBlockParam
  | ThinkingBlockParam
  | RedactedThinkingBlockParam
  | ToolUseBlockParam
  | ToolResultBlockParam
  | ServerToolUseBlockParam
  | WebSearchToolResultBlockParam
  | CodeExecutionToolResultBlockParam
  | ... // 15+ variants

// ContentBlock - Output side (what you receive)
type ContentBlock =
  | TextBlock
  | ImageBlock
  | ToolUseBlock
  | ToolResultBlock
  | ThinkingBlock
  | RedactedThinkingBlock
  | ServerToolUseBlock
  | ... // Similar variants
```

#### Param vs Response Type Pattern
```typescript
// Param types have "Param" suffix - used in requests
interface TextBlockParam {
  type: "text";
  text: string;
  cache_control?: CacheControlEphemeral | null;
  citations?: Iterable<TextCitationParam>;
}

// Response types - used in responses (no Param suffix)
interface TextBlock {
  type: "text";
  text: string;
  citations?: Array<TextCitation>;
}
```

### What vinhnt-sdk Can Learn
1. **Param vs Response separation** - same fields, different constraints
2. **Discriminated unions on `type` field** - exhaustive pattern matching
3. **Optional fields with `| null`** - explicit nullability
4. **Generated from OpenAPI spec** - Stainless code generation

---

## 3. Tool Use Type Structure

### Tool Definition Types
```typescript
// Tool input schema - JSON Schema format
interface Tool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;  // JSON Schema
  type?: string;  // Discriminator for built-in tools
  cache_control?: CacheControlEphemeral;
  defer_loading?: boolean;  // For tool search optimization
  strict?: boolean;  // Schema validation guarantee
}

// Built-in tool variants (discriminated union)
type ToolUnion =
  | Tool  // Custom user tool
  | WebSearchTool20250305
  | WebSearchTool20250910
  | WebSearchTool20260312
  | WebFetchTool20250910
  | WebFetchTool20260209
  | WebFetchTool20260309
  | CodeExecutionTool20250522
  | CodeExecutionTool20250825
  | CodeExecutionTool20260120
  | CodeExecutionTool20260521
  | ToolTextEditor20250124
  | ToolTextEditor20250429
  | ToolTextEditor20250728
  | ToolComputerUse20241022
  | ToolComputerUse20250124
  | BrowserToolset20260801
  | ComputerToolset20260801
  | ToolSearchToolRegex20251119
  | ToolSearchToolBm25_20251119;

// Tool choice configuration
type ToolChoice =
  | { type: "auto" }
  | { type: "any" }
  | { type: "tool"; name: string }
  | { type: "none" };
```

### Tool Use Response Types
```typescript
// Tool use block - model wants to call a tool
interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
  caller?: DirectCaller;
  server_tool_usage?: ServerToolUsage;
}

// Tool result block - you provide tool output
interface ToolResultBlockParam {
  type: "tool_result";
  tool_use_id: string;
  content?: string | Array<ContentBlockParam>;
  is_error?: boolean;
  cache_control?: CacheControlEphemeral;
}
```

### Design Decisions
- **Date-versioned tool types** - `WebSearchTool20250305`, `CodeExecutionTool20260521` for API versioning
- **`defer_loading`** - Tool search optimization, tools loaded on demand
- **`strict` mode** - Schema validation guarantee
- **Server tools** - `server_tool_use` for tools managed server-side

### What vinhnt-sdk Can Learn
1. **Versioned tool types** - API evolution without breaking changes
2. **Deferred loading** - Tool search optimization pattern
3. **Server-side tool execution** - `server_tool_use` for managed tools
4. **Strict schema validation** - Optional strict mode for tools

---

## 4. Extended Thinking Types

### Thinking Configuration
```typescript
// Request-side thinking config
type ThinkingConfigParam =
  | { type: "disabled" }
  | { type: "enabled"; budget_tokens: number }  // Legacy models
  | { type: "adaptive"; display?: "summarized" | "omitted" }  // New models

// Effort levels (adaptive thinking)
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
```

### Thinking Response Types
```typescript
// Thinking block in response
interface ThinkingBlock {
  type: "thinking";
  thinking: string;  // Encrypted thinking content
  signature: string;  // For multi-turn continuity
}

// Redacted thinking (when display="omitted")
interface RedactedThinkingBlock {
  type: "redacted_thinking";
  data: string;  // Encrypted blob
}

// Thinking delta in streaming
interface ThinkingDelta {
  type: "thinking_delta";
  thinking: string;
}

// Signature delta (end of thinking block)
interface SignatureDelta {
  type: "signature_delta";
  signature: string;
}
```

### Design Decisions
- **Encrypted thinking** - Thinking content encrypted, only decryptable by API
- **Signature for continuity** - Enables multi-turn thinking without re-sending
- **Display modes** - `summarized` (show text) vs `omitted` (hide for faster TTFT)
- **Budget-based vs adaptive** - Newer models self-manage thinking allocation

### What vinhnt-sdk Can Learn
1. **Encrypted reasoning** - Protect thinking tokens in transit
2. **Signature-based continuity** - Multi-turn without re-sending full context
3. **Display mode control** - User experience optimization
4. **Effort levels** - Declarative reasoning depth control

---

## 5. Prompt Caching Types

### Cache Control Structure
```typescript
// Cache control on content blocks
interface CacheControlEphemeral {
  type: "ephemeral";
  ttl?: "5m" | "1h";  // Default: 5 minutes
}

// Usage tracking
interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: CacheCreation;
}

interface CacheCreation {
  ephemeral_5m_input_tokens: number;
  ephemeral_1h_input_tokens: number;
}
```

### Usage in Content Blocks
```typescript
// System prompt with caching
{
  system: [
    {
      type: "text",
      text: "Long system prompt...",
      cache_control: { type: "ephemeral" }  // Cache breakpoint
    }
  ]
}

// Automatic caching (top-level)
{
  model: "claude-opus-5",
  cache_control: { type: "ephemeral" },  // Auto-cache last block
  messages: [...]
}

// Block-level caching (explicit)
{
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Reference document...",
          cache_control: { type: "ephemeral" }  // Explicit breakpoint
        }
      ]
    }
  ]
}
```

### Design Decisions
- **Two TTL tiers** - 5-minute (default) and 1-hour (2x cost)
- **Automatic vs explicit** - Top-level `cache_control` auto-manages breakpoints
- **Prefix matching** - Cache requires exact prefix match
- **Minimum 1024 tokens** - Below threshold, no caching
- **Usage tracking** - `cache_creation` and `cache_read` tokens in response

### What vinhnt-sdk Can Learn
1. **TTL-based caching** - Flexible cache duration
2. **Dual mode** - Auto and explicit cache control
3. **Cost transparency** - Detailed cache usage in response
4. **Breakpoint semantics** - Cache up to and including marked block

---

## 6. Message Types

### Message Structure
```typescript
// Request message
interface MessageParam {
  role: "user" | "assistant";
  content: string | Array<ContentBlockParam>;
}

// Response message
interface Message {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<ContentBlock>;
  model: string;
  stop_reason: StopReason | null;
  stop_sequence: string | null;
  usage: Usage;
  // Beta fields
  context_management?: BetaContextManagementResponse;
  diagnostics?: BetaDiagnostics;
}

// Stop reasons
type StopReason =
  | "end_turn"
  | "max_tokens"
  | "stop_sequence"
  | "tool_use"
  | "pause_tool"
  | "refusal"
  | "model_context_window_exceeded";
```

### Message Create Params
```typescript
interface MessageCreateParamsBase {
  model: string;
  max_tokens: number;
  messages: Array<MessageParam>;
  system?: string | Array<TextBlockParam>;
  stream?: boolean;
  tools?: Array<ToolUnion>;
  tool_choice?: ToolChoice;
  thinking?: ThinkingConfigParam;
  output_config?: OutputConfig;
  metadata?: Metadata;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  // Caching
  cache_control?: CacheControlEphemeral;
}

// Non-streaming vs streaming split
interface MessageCreateParamsNonStreaming extends MessageCreateParamsBase {
  stream?: false;
}

interface MessageCreateParamsStreaming extends MessageCreateParamsBase {
  stream: true;
}
```

### Design Decisions
- **Content as string or array** - Convenience shorthand for simple text
- **Model in response** - Echo back which model was used
- **Stop reason** - Granular completion status
- **Streaming/non-streaming split** - Overloaded `create()` method

### What vinhnt-sdk Can Learn
1. **Content polymorphism** - String or array input
2. **Stop reason enum** - Rich completion semantics
3. **Model echo** - Response includes model used
4. **Method overloading** - Type-safe streaming toggle

---

## 7. Streaming Implementation

### Stream Event Types
```typescript
// Raw stream events (discriminated union)
type RawMessageStreamEvent =
  | MessageStartEvent      // { type: "message_start"; message: Message }
  | ContentBlockStartEvent // { type: "content_block_start"; index; content_block }
  | ContentBlockDeltaEvent // { type: "content_block_delta"; index; delta }
  | ContentBlockStopEvent  // { type: "content_block_stop"; index }
  | MessageDeltaEvent      // { type: "message_delta"; delta; usage }
  | MessageStopEvent       // { type: "message_stop" }
  | PingEvent
  | ErrorEvent;

// Delta types (discriminated)
type ContentBlockDelta =
  | TextDelta { type: "text_delta"; text: string }
  | InputJSONDelta { type: "input_json_delta"; partial_json: string }
  | ThinkingDelta { type: "thinking_delta"; thinking: string }
  | SignatureDelta { type: "signature_delta"; signature: string }
  | CitationsDelta { type: "citations_delta"; citation: Citation };
```

### MessageStream Class
```typescript
// High-level streaming abstraction
class MessageStream<Params> {
  // Async iterator
  [Symbol.asyncIterator](): AsyncIterator<ParsedMessageStreamEvent>;

  // Convenience properties
  text_stream: AsyncGenerator<string>;  // Just text deltas

  // Final message (waits for completion)
  async finalMessage(): Promise<Message>;

  // Final text (concatenated text blocks)
  async finalText(): string;

  // Event emitter style
  on(event: "text", handler: (delta: string) => void): void;
  on(event: "thinking", handler: (delta: string) => void): void;
  on(event: "tool_use", handler: (toolUse: ToolUseBlock) => void): void;

  // Abort controller
  abort(): void;
}
```

### Usage Pattern
```typescript
// Async iterator pattern
const stream = client.messages.stream({
  model: "claude-opus-5",
  max_tokens: 64000,
  messages: [{ role: "user", content: "Write a story" }],
});

for await (const event of stream) {
  switch (event.type) {
    case "content_block_delta":
      if (event.delta.type === "text_delta") {
        process.stdout.write(event.delta.text);
      }
      break;
  }
}

// Get final message
const finalMessage = await stream.finalMessage();
console.log(`Tokens: ${finalMessage.usage.output_tokens}`);

// Event emitter pattern
stream.on("text", (delta) => process.stdout.write(delta));
stream.on("thinking", (delta) => console.log("[Thinking]", delta));
```

### Design Decisions
- **Dual API** - Async iterator AND event emitter
- **text_stream property** - Convenience for text-only consumption
- **finalMessage()** - Waits for completion, returns accumulated message
- **Abort support** - Cancel streaming mid-way

### What vinhnt-sdk Can Learn
1. **Dual streaming API** - Iterator + emitter patterns
2. **Convenience streams** - `text_stream` for common case
3. **Final message accumulation** - Build complete message from deltas
4. **Abort controller integration** - Cancellation support

---

## 8. Error Handling Patterns

### Error Hierarchy
```typescript
// Base error
class AnthropicError extends Error {}

// API errors (HTTP status codes)
class APIError extends AnthropicError {
  status: number;
  error: ErrorObject;
  request_id: string;
}

// Specific error types
class APIConnectionError extends AnthropicError {}
class APIConnectionTimeoutError extends APIConnectionError {}
class APIUserAbortError extends AnthropicError {}
class BadRequestError extends APIError {}       // 400
class AuthenticationError extends APIError {}   // 401
class PermissionDeniedError extends APIError {} // 403
class NotFoundError extends APIError {}         // 404
class ConflictError extends APIError {}         // 409
class UnprocessableEntityError extends APIError {} // 422
class RateLimitError extends APIError {}        // 429
class InternalServerError extends APIError {}   // 500
class OverloadedError extends APIError {}       // 529

// Retryable errors
class RetryableError extends AnthropicError {}
```

### Error Object Structure
```typescript
interface ErrorObject {
  type: ErrorType;
  error: {
    type: string;
    message: string;
  };
}

type ErrorType =
  | "api_error"
  | "authentication_error"
  | "billing_error"
  | "invalid_request_error"
  | "not_found_error"
  | "overloaded_error"
  | "permission_error"
  | "rate_limit_error";
```

### Design Decisions
- **HTTP-mapped errors** - Status code to error class mapping
- **Request ID tracking** - Every error includes request_id
- **Retryable distinction** - `RetryableError` for automatic retry logic
- **Nested error structure** - `error.error.type` for API error type

### What vinhnt-sdk Can Learn
1. **Rich error hierarchy** - Specific error classes for each HTTP status
2. **Request ID propagation** - Essential for debugging
3. **Retryable classification** - Automatic retry guidance
4. **Error body preservation** - Full API error response accessible

---

## 9. TypeScript Type Patterns

### Key Patterns Used

#### 1. Discriminated Unions
```typescript
// All content blocks use "type" as discriminator
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "thinking"; thinking: string; signature: string }
  | { type: "redacted_thinking"; data: string };

// Exhaustive matching
function processBlock(block: ContentBlock) {
  switch (block.type) {
    case "text": return block.text;
    case "tool_use": return block.name;
    case "thinking": return block.thinking;
    case "redacted_thinking": return block.data;
  }
}
```

#### 2. Param/Response Split
```typescript
// Input types (what you send)
interface TextBlockParam {
  type: "text";
  text: string;
  cache_control?: CacheControlEphemeral | null;
}

// Output types (what you receive)
interface TextBlock {
  type: "text";
  text: string;
  citations?: Array<TextCitation>;
}
```

#### 3. Nullable vs Optional
```typescript
// Optional (may be undefined)
field?: string;

// Nullable (may be null)
field: string | null;

// Both (may be undefined or null)
field?: string | null;
```

#### 4. Type Narrowing with `in` operator
```typescript
if ("result" in message) {
  // message is a result type
}
```

#### 5. Generics for Parsed Output
```typescript
interface ParsedMessage<ParsedT> extends Message {
  content: Array<ParsedContentBlock<ParsedT>>;
  parsed_output: ParsedT | null;
}

type ExtractParsedContentFromParams<Params> =
  Params extends { output_config: { format: AutoParseableOutputFormat<infer P> } }
    ? P
    : null;
```

### What vinhnt-sdk Can Learn
1. **Discriminated unions everywhere** - Type-safe polymorphism
2. **Param vs Response types** - Same schema, different constraints
3. **Nullable handling** - Explicit `| null` for API responses
4. **Generic type extraction** - Infer types from input params

---

## 10. Content Blocks Architecture

### Input Content Blocks (ContentBlockParam)
```typescript
type ContentBlockParam =
  | TextBlockParam
  | ImageBlockParam
  | DocumentBlockParam
  | SearchResultBlockParam
  | ThinkingBlockParam
  | RedactedThinkingBlockParam
  | ToolUseBlockParam
  | ToolResultBlockParam
  | ServerToolUseBlockParam
  | WebSearchToolResultBlockParam
  | WebFetchToolResultBlockParam
  | CodeExecutionToolResultBlockParam
  | BashCodeExecutionToolResultBlockParam
  | TextEditorCodeExecutionToolResultBlockParam
  | ToolSearchToolResultBlockParam
  | ContainerUploadBlockParam;
```

### Output Content Blocks (ContentBlock)
```typescript
type ContentBlock =
  | TextBlock
  | ImageBlock
  | DocumentBlock
  | ToolUseBlock
  | ToolResultBlock
  | ThinkingBlock
  | RedactedThinkingBlock
  | ServerToolUseBlock
  | CodeExecutionOutputBlock
  | CodeExecutionResultBlock
  | CodeExecutionToolResultBlock
  | BashCodeExecutionOutputBlock
  | BashCodeExecutionResultBlock
  | BashCodeExecutionToolResultBlock
  | WebFetchBlock
  | ToolSearchToolSearchResultBlock
  | TextEditorCodeExecutionCreateResultBlock
  | TextEditorCodeExecutionStrReplaceResultBlock
  | Container;
```

### Design Decisions
- **Asymmetric input/output** - Input blocks ≠ Output blocks
- **Server tools** - `server_tool_use`, `code_execution` managed server-side
- **Tool results** - Separate block type for tool execution results
- **Search results** - `search_result` block for web search
- **Documents** - `document` block for PDF/file content

### What vinhnt-sdk Can Learn
1. **Asymmetric block types** - Input vs output have different shapes
2. **Server-managed tools** - Some tools execute server-side
3. **Rich result types** - Code execution, search results, etc.
4. **Block-level caching** - Each block can have `cache_control`

---

## 11. Token Usage Reporting

### Usage Structure
```typescript
interface Usage {
  // Core counts
  input_tokens: number;
  output_tokens: number;

  // Cache tracking
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: CacheCreation;

  // Server tool usage
  server_tool_usage?: ServerToolUsage;
  server_tool_call_duration_ms?: number;
}

interface CacheCreation {
  ephemeral_5m_input_tokens: number;
  ephemeral_1h_input_tokens: number;
}

interface ServerToolUsage {
  web_search_requests?: number;
}
```

### Token Count API
```typescript
// Count tokens without creating message
const count = await client.messages.countTokens({
  model: "claude-opus-5",
  messages: [{ content: "Hello", role: "user" }],
  tools: [...],
});

// Response
interface MessageTokensCount {
  input_tokens: number;
}
```

### Design Decisions
- **Separate input/output counts** - Clear cost attribution
- **Cache granularity** - 5m vs 1h cache creation tracking
- **Server tool usage** - Separate tracking for server-side tools
- **Pre-count API** - Estimate tokens before sending

### What vinhnt-sdk Can Learn
1. **Granular cache tracking** - 5m vs 1h token counts
2. **Server tool accounting** - Track server-side operations
3. **Pre-flight token count** - Cost estimation endpoint
4. **Tool duration tracking** - Server tool call timing

---

## 12. OpenCode Agent SDK Patterns

### Architecture
OpenCode provides a multi-provider agent SDK that wraps the OpenCode CLI:
- **Drop-in replacement** for Claude Agent SDK
- **Multi-provider support** - Anthropic, OpenAI, xAI, etc.
- **Headless mode** - Run as subprocess or connect to running server

### SDK Structure
```python
# Python SDK
from opencode_agent_sdk import SDKClient, AgentOptions, tool, create_sdk_mcp_server

client = SDKClient(options=AgentOptions(
    cwd="/path/to/project",
    model="claude-haiku-4-5",
    mcp_servers={"my-tools": sdk_server},
    allowed_tools=["mcp__my-tools__greet"],
    hooks={...},
))

await client.connect()
await client.query("Hello!")
async for msg in client.receive_response():
    print(msg)
```

### Key Patterns
1. **MCP integration** - Tools as MCP servers
2. **Hook system** - Intercept tool execution
3. **Permission modes** - Control tool execution safety
4. **Session management** - Persistent context

### What vinhnt-sdk Can Learn
1. **MCP as tool protocol** - Standardized tool interface
2. **Multi-provider abstraction** - Same API for different LLMs
3. **Subprocess mode** - Run agent as child process
4. **Hook-based extensibility** - Intercept and modify behavior

---

## 13. A2A Protocol Patterns

### Core Concepts
```typescript
// Agent Card - Discovery metadata
interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
  };
  skills: Array<Skill>;
  defaultInputModes: Array<string>;
  defaultOutputModes: Array<string>;
  authentication: Authentication;
}

// Task - Unit of work
interface Task {
  id: string;
  contextId: string;
  status: TaskStatus;
  artifacts?: Array<Artifact>;
  history?: Array<Message>;
}

// Message - Communication turn
interface Message {
  role: "user" | "agent";
  parts: Array<Part>;
  messageId: string;
  taskId?: string;
  contextId?: string;
  referenceTaskIds?: Array<string>;
}

// Part - Content unit
interface Part {
  type: "text" | "file" | "data";
  text?: string;
  file?: FileContent;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Task lifecycle
type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "failed"
  | "canceled"
  | "rejected"
  | "auth-required";
```

### Transport Options
1. **JSON-RPC 2.0** - Standard HTTP POST
2. **SSE** - Server-Sent Events for streaming
3. **gRPC** - Protocol Buffers for high performance

### Design Decisions
- **Opaque execution** - Agents don't share internal state
- **Capability discovery** - Agent Cards for self-description
- **Task-oriented** - All work as Tasks with lifecycle
- **Multi-modal parts** - Text, files, data in messages

### What vinhnt-sdk Can Learn
1. **Agent Cards** - Self-describing agents
2. **Task lifecycle** - State machine for agent work
3. **Part-based messages** - Multi-modal content
4. **Opaque execution** - Security through abstraction

---

## 14. Recommendations for vinhnt-sdk

### Architecture Principles
1. **Discriminated unions for all polymorphic types** - Type safety
2. **Param/Response split** - Same schema, different constraints
3. **Async generator streaming** - Elegant async iteration
4. **Plugin architecture** - Extensible via hooks, skills, MCP
5. **Built-in tool execution** - No need to implement basics

### Type System
1. **Use `type` field as discriminator** - Exhaustive matching
2. **Nullable vs Optional** - Explicit about nullability
3. **Versioned types** - API evolution without breaking changes
4. **Generic type extraction** - Infer types from params

### Streaming
1. **Dual API** - Async iterator AND event emitter
2. **Convenience streams** - `text_stream` for common case
3. **Final message accumulation** - Build complete from deltas
4. **Abort controller** - Cancellation support

### Error Handling
1. **Rich error hierarchy** - Specific classes per HTTP status
2. **Request ID propagation** - Essential for debugging
3. **Retryable classification** - Automatic retry guidance

### Caching
1. **TTL-based caching** - Flexible duration
2. **Dual mode** - Auto and explicit breakpoints
3. **Cost transparency** - Detailed cache usage tracking

### Tool System
1. **Zod schemas** - Type-safe tool definitions
2. **Deferred loading** - Tool search optimization
3. **Server-side tools** - Managed tool execution
4. **Strict mode** - Optional schema validation

### Agent Protocol
1. **Agent Cards** - Self-describing agents
2. **Task lifecycle** - State machine for work
3. **MCP integration** - Standardized tool protocol
4. **A2A compatibility** - Agent-to-agent communication

---

## 15. Code Examples for vinhnt-sdk

### Tool Definition Pattern
```typescript
import { z } from "zod";

// Type-safe tool definition
interface ToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  execute: (input: TInput) => Promise<TOutput>;
  annotations?: ToolAnnotations;
  cacheControl?: CacheControlEphemeral;
}

// Tool annotations
interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

// Registration
function tool<TInput, TOutput>(
  name: string,
  description: string,
  schema: TSchema,
  execute: (input: TInput) => Promise<TOutput>
): ToolDefinition<TInput, TOutput>;
```

### Streaming Pattern
```typescript
// Async generator streaming
async function* streamMessages(
  params: MessageCreateParams
): AsyncGenerator<StreamEvent> {
  const response = await fetch("/v1/messages", {
    method: "POST",
    body: JSON.stringify({ ...params, stream: true }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    // Parse SSE events
    for (const event of parseSSE(text)) {
      yield event;
    }
  }
}

// Usage
for await (const event of streamMessages(params)) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    process.stdout.write(event.delta.text);
  }
}
```

### Cache Control Pattern
```typescript
// Automatic caching
const response = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 1024,
  cache_control: { type: "ephemeral" },  // Auto-cache
  system: "Long system prompt...",
  messages: [...],
});

// Check cache usage
console.log(`Cache created: ${response.usage.cache_creation_input_tokens}`);
console.log(`Cache read: ${response.usage.cache_read_input_tokens}`);

// Explicit caching
const response2 = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: "Long system prompt...",
      cache_control: { type: "ephemeral", ttl: "1h" }  // 1-hour cache
    }
  ],
  messages: [...],
});
```

---

*Research compiled from Anthropic SDK source, documentation, and A2A protocol specification.*
*Last updated: September 2026*
