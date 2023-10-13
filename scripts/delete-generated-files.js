import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const generatedFileExtension = /(\.cjs|\.d\.c?ts)$/;

/**
 * Deletes the CommonJS files and `.d.ts` files that were automatically generated by the project's build step.
 *
 * @param {string} directoryPath The _absolute path_ to a package folder _or_ a directory within a package folder
 * @param {boolean} [isPackageDirectory] Indicates that `directoryPath` points _directly_ to a package folder
 * (e.g., the `/packages/core` folder).
 * @returns {Promise<void[]>}
 */
export default async function deleteGeneratedFilesFrom(directoryPath, isPackageDirectory) {
  const filenames = await fs.readdir(directoryPath);

  return Promise.all(
    filenames.map(async (f) => {
      const filepath = path.resolve(directoryPath, f);
      if ((await fs.stat(filepath)).isDirectory()) return /** @type {any} */ (deleteGeneratedFilesFrom(filepath));

      if (!generatedFileExtension.test(f) && f !== ".npmignore" && f !== "LICENSE") return;
      if (isPackageDirectory && (f === "index.d.ts" || f === "types.d.ts")) return;
      return fs.rm(filepath);
    }),
  );
}

// Immediately clear all generated files from package folders if this file was invoked by the command line
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(new URL(import.meta.url).pathname, "../../");
  const packages = await fs.readdir(path.resolve(root, "packages"));
  await Promise.all(packages.map((p) => deleteGeneratedFilesFrom(path.resolve(root, "packages", p), true)));
}