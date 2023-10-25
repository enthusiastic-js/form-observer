import { defineWorkspace } from "vitest/config";
import type { UserWorkspaceConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default defineWorkspace([
  { test: createProjectConfig("core") },
  { test: createProjectConfig("react", ["ts", "tsx"]) },
  { test: createProjectConfig("solid", ["ts", "tsx"]), plugins: [solid()] },
  { test: createProjectConfig("svelte"), plugins: [svelte({ preprocess: vitePreprocess() })] },
  { test: createProjectConfig("vue") },
]);

function createProjectConfig(name: string, extensions = ["ts"]): Required<UserWorkspaceConfig>["test"] {
  const extensionGlob = extensions.length === 1 ? extensions[0] : `{${extensions.join(",")}}`;

  return { name, environment: "jsdom", include: [`packages/${name}/**/__tests__/**/*.test.${extensionGlob}`] };
}
