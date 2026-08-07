import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/agent-core',
  'packages/schema',
  'packages/config',
  'packages/mcp',
  'packages/lsp',
  'packages/rag',
  'packages/model-adapters',
  'packages/persistence',
  'packages/observability',
  'packages/plugin-sdk',
  'packages/api-contract',
]);
