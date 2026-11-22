import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Image encoding is CPU-heavy, and test files run in parallel and share the CPU,
    // so the 5 s default is too tight for the bigger conversions.
    testTimeout: 30_000,
  },
})
