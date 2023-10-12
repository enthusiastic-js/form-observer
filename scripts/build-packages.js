// Prepares ALL NPM Packages for publishing
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import deleteGeneratedFilesFrom from "./delete-generated-files.js";

/* -------------------- Project Builder Logic -------------------- */
console.log("Building all of the NPM Packages in the `/packages` folder...");
const root = path.resolve(new URL(import.meta.url).pathname, "../../");
const packages = await fs.readdir(path.resolve(root, "packages"));

Promise.all(packages.map((p) => deleteGeneratedFilesFrom(path.resolve(root, "packages", p), true)))
  .then(async () => {
    /*
     * TODO: Because of a bug in how TypeScript compiles JS files with JSDocs that use generic constructors,
     * we need to use `Promise.allSettled` for the "child packages" instead of `Promise.all`. We ARE NOT
     * going to use the `skipLibCheck` option because we want to make sure that ALL of our types are working
     * properly. So using `Promise.allSettled` is a temporary fix until this TS Bug gets reported
     * (GH Issue to come) and resolved. Despite the fact that TS currently has this issue and throws an
     * error during the build process (hence `Promise.allSettled`), all of the types seem to get generated
     * as expected. So again, this works for now.
     */
    await generateDTSFilesFor(/** @type {string} */ (packages.find((p) => p === "core")));
    return Promise.allSettled(packages.filter((p) => p !== "core").map(generateDTSFilesFor));
  })
  .then(() => Promise.all(packages.map((p) => generateCJSFilesFor(path.resolve(root, "packages", p)))))
  .then(() => Promise.all(packages.map(addNPMFilesTo)))
  .then(() => console.log("\nBuild process was successful."))
  .catch((error) => {
    console.log("\nReverting the build process because the following error occurred:\n");
    console.error(error);
    return Promise.all(packages.map((p) => deleteGeneratedFilesFrom(path.resolve(root, "packages", p), true)));
  });

/* -------------------- Function for Generating (Regular) `.d.ts` Files -------------------- */
/**
 * Generates the `.d.ts` files needed to provide consumers with proper TS types.
 *
 * Note: This function _does not_ generate `.d.cts` files. See the (temporary) {@link generateCJSFilesFor}
 * function for that behavior instead.
 *
 * @param {string} packageDirectory The **_name_** of a package folder
 * @returns {Promise<void>}
 */
async function generateDTSFilesFor(packageDirectory) {
  const directoryPath = path.resolve(root, "packages", packageDirectory);

  return new Promise((resolve, reject) => {
    exec("npx tsc", { cwd: directoryPath }, (error) => (error ? reject(error) : resolve()));
  });
}

/* -------------------- Function for Generating CommonJS Files -------------------- */
const esmFiles = /"(.+?)\.(j|t)s"/g; // Note: Appending `?` to `.+` makes the search non-greedy
const cjsFiles = '"$1.c$2s"';

const importNamed = /import ({ .+ }) from (".+")/g;
const importDefault = /import (\w+) from (".+")/g;

const jsdoc = /(\/\*\*\s*\n([^*]|(\*(?!\/)))*\*\/\n)/;
const exportDefaultFunc = new RegExp(`${jsdoc.toString().slice(1, -1)}export default function (\\w+)(.+)`);
const exportDefaultValue = /export default (\w+);/;
const exportFunc = new RegExp(`${jsdoc.toString().slice(1, -1)}export function (\\w+)(.+)`, "g");
const exportDefaultAs = /export { default as (.+) } from (".+");/g;
const exportAll = /export \* from (".+");/g;

/**
 * Generates the CommonJS Files (i.e., the `.cjs` and `.d.cts` files) necessary for the project's packages
 * to work with servers relying on CommonJS.
 *
 * Note: This function can be deleted after ECMAScript Modules have sufficient support in Node
 * and CJS is no longer needed by (or an impediment for) the vast majority of users.
 *
 * @param {string} directoryPath The _absolute path_ to a package folder _or_ a directory within a package folder
 * @returns {Promise<void[]>}
 */
async function generateCJSFilesFor(directoryPath) {
  const filenames = await fs.readdir(directoryPath);

  return Promise.all(
    filenames.map(async (f) => {
      const filepath = path.resolve(directoryPath, f);
      if ((await fs.stat(filepath)).isDirectory()) return /** @type {any} */ (generateCJSFilesFor(filepath));
      if (!f.endsWith(".js") && !f.endsWith(".d.ts")) return;

      // Create `.d.cts` Files
      if (f.endsWith(".d.ts")) {
        const dts = await fs.readFile(filepath, "utf-8");
        return fs.writeFile(filepath.replace(/\.ts$/, ".cts"), dts.replaceAll(esmFiles, cjsFiles), "utf-8");
      }

      // Create `.cjs` Files
      // WARNING: The order of the `default` exports is INTENTIONAL and CRITICAL
      const esmVersion = await fs.readFile(filepath, "utf-8");
      const cjsVersion = esmVersion
        .replaceAll(esmFiles, cjsFiles)
        .replaceAll(importNamed, "const $1 = require($2)")
        .replaceAll(importDefault, "const $1 = require($2)")
        .replace(exportDefaultFunc, "module.exports = $4;\nmodule.exports.default = $4;\n$1function $4$5")
        .replace(exportDefaultValue, "module.exports = $1;\nmodule.exports.default = $1;")
        .replaceAll(exportAll, "Object.assign(module.exports, { ...require($1) });")
        .replaceAll(exportFunc, "module.exports.$4 = $4;\n$1function $4$5")
        .replaceAll(exportDefaultAs, "module.exports.$1 = require($2);");

      return fs.writeFile(filepath.replace(/\.js$/, ".cjs"), `"use strict";\n\n${cjsVersion}`, "utf-8");
    }),
  );
}

/* -------------------- Function for Generating CommonJS Files -------------------- */
/**
 * Adds files to the specified `packageDirectory` that are needed for a successful
 * [`npm publish`](https://docs.npmjs.com/cli/v10/commands/npm-publish?v=true).
 * @param {string} packageDirectory The **_name_** of a package folder
 * @return {Promise<void[]>}
 */
function addNPMFilesTo(packageDirectory) {
  const publishFiles = /** @type {const} */ ([".npmignore", "LICENSE"]);
  const directoryPath = path.resolve(root, "packages", packageDirectory);
  return Promise.all(publishFiles.map((f) => fs.copyFile(path.resolve(root, f), path.resolve(directoryPath, f))));
}
