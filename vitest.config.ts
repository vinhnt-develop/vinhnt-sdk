import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: false,
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.d.ts', 'packages/*/test/**', 'packages/*/src/**/fixtures/**'],
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: './coverage',
    },
    projects: [
      'packages/core',
      'packages/config',
      'packages/llm',
      'packages/guard',
      'packages/mcp',
      'packages/trace',
      'packages/event',
      'packages/permission',
      'packages/schema',
      'packages/tools',
      'packages/step-executor',
      'packages/session',
      'packages/sandbox',
      'packages/knowledge',
      'packages/security',
      'packages/plugin',
      'packages/lsp',
      'packages/provider-openai-compatible',
    ],
  },
});
