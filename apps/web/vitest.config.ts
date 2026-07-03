import { defineConfig } from 'vitest/config'

// Pure-logic unit tests (no DOM, no network, no DB). Tests live in test/ so they
// stay out of the app's tsconfig/eslint `src` scope and the Vite build.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
