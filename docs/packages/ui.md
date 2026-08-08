# @vinhnt-sdk/ui

> React component library for agent chat interfaces and ACP client.

**npm:** `npm install @vinhnt-sdk/ui`  
**Size:** ~209 KB  
**Dependencies:** React 19, Radix UI, Tailwind CSS, Zustand  
**Peer deps:** `react`, `react-dom`

---

## Overview

`ui` provides React components for building agent user interfaces:

- **Chat Components** — Messages, input, message list
- **Primitives** — Button, Card, Input, Badge, Dialog
- **Hooks** — Theme, ACP stream, stores
- **ACP Client** — WebSocket connection to agent server
- **API Client** — REST API functions

## Installation

```bash
npm install @vinhnt-sdk/ui react react-dom
```

## Exports

### Chat Components

```tsx
import {
  ChatMessage,
  ChatInput,
  MessageList,
  ToolCall,
  CodeBlock,
  Markdown,
} from "@vinhnt-sdk/ui";

function Chat() {
  return (
    <div>
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
```

### Primitives

```tsx
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Badge,
  Avatar,
  Dialog,
  Select,
  DropdownMenu,
} from "@vinhnt-sdk/ui";

function Settings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="API Key" />
        <Select options={modelOptions} />
        <Button>Save</Button>
      </CardContent>
    </Card>
  );
}
```

### Hooks

```tsx
import {
  useTheme,
  useAcpStream,
  useConnectionStore,
  useSessionStore,
  useMessageStore,
} from "@vinhnt-sdk/ui";

function MyComponent() {
  const { theme, setTheme } = useTheme();
  const { connected } = useConnectionStore();
  const { messages, addMessage } = useMessageStore();
}
```

### ACP Client

```tsx
import { AcpClient } from "@vinhnt-sdk/ui";

const client = new AcpClient({
  url: "ws://localhost:3000/acp",
});

await client.connect();

// Create session
const session = await client.createSession({
  agentId: "coding-assistant",
});

// Start task
await client.startTask({
  sessionId: session.id,
  prompt: "Fix the bug",
});
```

### API Client

```tsx
import {
  apiFetch,
  setApiBaseUrl,
  setApiToken,
  fetchSessions,
  createSession,
  executeTool,
} from "@vinhnt-sdk/ui";

// Configure
setApiBaseUrl("http://localhost:3000");
setApiToken("your-api-token");

// Use
const sessions = await fetchSessions();
const session = await createSession({ agentId: "assistant" });
const result = await executeTool({ name: "read_file", input: { path: "tsconfig.json" } });
```

### i18n

```tsx
import { setupI18n, changeLanguage } from "@vinhnt-sdk/ui";

setupI18n();
changeLanguage("vi"); // or "en"
```
