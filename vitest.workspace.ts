import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/core',
  'packages/schema',
  'packages/config',
  'packages/mcp',
  'packages/lsp',
  'packages/rag',
  'packages/adapters',
  'packages/store',
  'packages/otel',
  'packages/plugin',
  'packages/api',
  'packages/ui',
]);
