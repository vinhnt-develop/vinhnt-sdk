import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'evals',
    include: ['**/*.eval.test.ts'],
    environment: 'node',
  },
});
