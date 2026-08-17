import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core',
      'packages/schema',
      'packages/tools',
      'packages/knowledge',
      'packages/security',
      'packages/plugin',
      'packages/lsp',
      'packages/provider-openai-compatible',
    ],
  },
});
