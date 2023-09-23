import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["./**/__tests__/**/*.test.ts?(x)"],
    environment: "jsdom",

    coverage: {
      provider: "istanbul",
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
});
