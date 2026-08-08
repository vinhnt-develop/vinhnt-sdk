# @vinhnt-sdk/knowledge

## 1.0.0

### Minor Changes

- b4cb258: Refactor to minimal library architecture (9 packages)

  - Extracted `@vinhnt-sdk/security` from core (prompt injection protection, secret redaction)
  - Extracted `@vinhnt-sdk/knowledge` from core (memory, context compression, learning engine)
  - Extracted `@vinhnt-sdk/tools` from core (file, shell, git, web, search tools)
  - Moved model types (`ChatMessage`, `ModelProvider`, `ModelRequest`, etc.) to `@vinhnt-sdk/schema`
  - Added `ToolDefinitionLike` interface to schema for cross-package typing
  - Added `ConversationCompactor`, `SessionStore`, `RunEventStore` interfaces to schema
  - Updated `ModelProvider` interface: added `provider` (required), `capabilities`, required `stream()`
  - Added `ModelCapabilities` interface for feature flags
  - Added `temperature`, `topP`, `stopSequences`, `providerOptions` to `ModelRequest`
  - Fixed LSP Windows-only `where` command (now cross-platform)
  - Fixed RAG Voyage hardcoded URL (added `baseUrl` config option)
  - Core re-exports all extracted packages for backward compatibility

### Patch Changes

- Major refactor: split core into tools/knowledge/security packages, remove non-library packages, fix all hardcoded data violations.
- Updated dependencies [b4cb258]
- Updated dependencies
  - @vinhnt-sdk/schema@1.0.0
  - @vinhnt-sdk/tools@1.0.0
