import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
});
