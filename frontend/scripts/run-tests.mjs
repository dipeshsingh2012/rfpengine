import { build } from "esbuild";
import { readdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const testsDir = "src/tests";
const testFiles = readdirSync(testsDir)
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => join(testsDir, f));

console.log(`Bundling ${testFiles.length} test files with esbuild...`);

await build({
  entryPoints: testFiles,
  outdir: "dist/tests",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: "inline",
});

console.log("Running node:test test suite with coverage...");
const result = spawnSync(
  "node",
  ["--test", "--experimental-test-coverage", "dist/tests/*.test.js"],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 0);
