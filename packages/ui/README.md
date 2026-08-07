# @vnt/ui

Shared React UI components for VNT Agent — chat view, settings, code blocks, and ACP client.

## Install

```bash
# npm
npm install @vnt/ui

# pnpm (monorepo)
pnpm add @vnt/ui
```

## Peer Dependencies

This package requires React 19 as a peer dependency:

```json
{
  "react": "^19.1.0",
  "react-dom": "^19.1.0"
}
```

## Quick Start

```tsx
import { ChatView, CodeBlock, Button, useTheme } from '@vnt/ui';

function App() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className={theme}>
      <ChatView messages={messages} onSend={handleSend} />
      <CodeBlock code="const x = 1;" language="typescript" />
    </div>
  );
}
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `ChatMessage`, `MessageList`, `ChatInput` | Component | Chat UI primitives |
| `CodeBlock` | Component | Syntax-highlighted code display |
| `ToolCall` | Component | Expandable tool call card |
| `Markdown` | Component | Markdown renderer (GFM + code highlight) |
| `Button`, `Input`, `Badge`, `Card`, `Dialog`, `Select` | Component | shadcn/ui base components |
| `AcpClient` | Class | ACP WebSocket client |
| `useTheme`, `useAppearance` | Hook | Theme management |
| `useSessionStore`, `useConfigStore`, `useMessageStore` | Hook | Zustand state stores |
| `apiFetch` + 60+ API functions | Function | REST API client |
| `setupI18n`, `changeLanguage` | Function | i18n support (EN/VI) |

## Subpath Imports

```typescript
import { ChatView } from '@vnt/ui';                  // main
import { Button } from '@vnt/ui/components/button';  // deep import
import { useTheme } from '@vnt/ui/hooks/use-theme';  // deep import
```

## License

MIT
