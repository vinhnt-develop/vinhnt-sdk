import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core',
      'packages/event',
      'packages/model-caller',
      'packages/permission',
      'packages/schema',
      'packages/tools',
      'packages/tool-saga',
      'packages/step-executor',
      'packages/session',
      'packages/sandbox',
      'packages/sandbox-host',
      'packages/sandbox-process',
      'packages/sandbox-container',
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
