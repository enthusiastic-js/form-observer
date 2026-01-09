import { defineConfig } from "vitest/config";
import type { UserWorkspaceConfig } from "vitest/config";
import { preact } from "@preact/preset-vite";
import solid from "vite-plugin-solid";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      include: ["packages/**/*.js"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    projects: [
      { test: createProjectConfig("core") },
      { test: createProjectConfig("lit") },
      // NOTE: Preact Vite Preset is too aggressive and tries to transform `Core` files. So we're restricting its reach.
      { test: createProjectConfig("preact", ["tsx"]), plugins: [preact({ include: "packages/preact/**/*.test.tsx" })] },
      { test: createProjectConfig("react", ["ts", "tsx"]) },
      { test: createProjectConfig("solid", ["ts", "tsx"]), plugins: [solid()] },
      { test: createProjectConfig("svelte"), plugins: [svelte(), svelteTesting({ autoCleanup: false })] },
      { test: createProjectConfig("vue") },
    ],
  },
});

function createProjectConfig(name: string, extensions = ["ts"]): Required<UserWorkspaceConfig>["test"] {
  const extensionGlob = extensions.length === 1 ? extensions[0] : `{${extensions.join(",")}}`;

  return { name, environment: "jsdom", include: [`packages/${name}/**/__tests__/**/*.test.${extensionGlob}`] };
}
