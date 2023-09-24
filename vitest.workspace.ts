import { defineWorkspace } from "vitest/config";
import type { UserWorkspaceConfig } from "vitest/config";

export default defineWorkspace([
  { test: createProjectConfig("core") },
  { test: createProjectConfig("react", ["ts", "tsx"]) },
  { test: createProjectConfig("svelte") },
]);

function createProjectConfig(name: string, extensions = ["ts"]): Required<UserWorkspaceConfig>["test"] {
  const extensionGlob = extensions.length === 1 ? extensions[0] : `{${extensions.join(",")}}`;

  return { name, environment: "jsdom", include: [`packages/${name}/**/__tests__/**/*.test.${extensionGlob}`] };
}
