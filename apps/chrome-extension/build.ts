import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";

const rootDir = import.meta.dir;
const outDir = join(rootDir, "dist-extension");

await rm(outDir, { force: true, recursive: true });
await mkdir(outDir, { recursive: true });

await bundle("background.ts", "background.js", "esm");
await bundle("content.ts", "content.js", "iife");
await bundle("popup.ts", "popup.js", "iife");
await assertChromeLoadable("background.js");
await assertChromeLoadable("content.js");

async function bundle(entrypoint: string, outfile: string, format: "esm" | "iife") {
  await $`bun build ${join(rootDir, "src", entrypoint)} --outfile=${join(outDir, outfile)} --target=browser --format=${format}`;
}

async function assertChromeLoadable(fileName: string) {
  const output = await readFile(join(outDir, fileName), "utf8");
  if (/^\s*import\s/m.test(output)) {
    throw new Error(`${fileName} contains an import statement; Chrome cannot load this unpacked script as emitted.`);
  }
}
