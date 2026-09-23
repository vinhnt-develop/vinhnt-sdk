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
      // P1-10: always emit coverage even when pre-existing unit tests fail.
      reportOnFailure: true,
      // P1-10 G20b: start modest (lines 60), ramp to 75 once baseline is stable.
      thresholds: {
        lines: 60,
        statements: 60,
        branches: 65,
        functions: 25,
      },
    },
    projects: [
      'packages/core',
      'packages/config',
      'packages/llm',
      'packages/guard',
      'packages/guardrails',
      'packages/workflow',
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
      'evals',
    ],
  },
});
