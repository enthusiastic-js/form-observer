import { defineConfig } from "vitest/config";
import type { UserWorkspaceConfig } from "vitest/config";
import preact from "@preact/preset-vite";
import react from "@vitejs/plugin-react";
import solid from "vite-plugin-solid";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import vue from "@vitejs/plugin-vue";

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
      { test: createProjectConfig("react", ["ts", "tsx"]), plugins: [react({ include: "packages/react/**/*" })] },
      { test: createProjectConfig("solid", ["ts", "tsx"]), plugins: [solid({ include: "packages/solid/**/*" })] },
      {
        test: createProjectConfig("svelte"),
        plugins: [svelte({ include: "packages/svelte/**/*.svelte" }), svelteTesting({ autoCleanup: false })],
      },
      { test: createProjectConfig("vue"), plugins: [vue({ include: "packages/vue/**/*.vue" })] },
    ],
  },
});

function createProjectConfig(name: string, extensions = ["ts"]): Required<UserWorkspaceConfig>["test"] {
  const extensionGlob = extensions.length === 1 ? extensions[0] : `{${extensions.join(",")}}`;

  return { name, environment: "jsdom", include: [`packages/${name}/**/__tests__/**/*.test.${extensionGlob}`] };
}
