import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core',
      'packages/event',
      'packages/schema',
      'packages/tools',
      'packages/knowledge',
      'packages/security',
      'packages/plugin',
      'packages/lsp',
      'packages/provider-openai-compatible',
      'packages/provider-deepseek',
      'packages/provider-anthropic',
      'packages/provider-ollama',
    ],
  },
});
