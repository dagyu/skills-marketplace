#!/usr/bin/env bun
// Compile the CLI into a standalone executable with `bun build --compile`,
// stamping the build time so `workflow --version` reports when it was built.
import { $ } from "bun";

const buildTime = new Date().toISOString();
const outfile = process.argv[2] ?? "dist/workflow";

// --define replaces the bare identifier `__BUILD_TIME__` with a string literal.
// JSON.stringify yields a quoted literal, e.g. "2026-05-22T13:00:00.000Z".
const define = `__BUILD_TIME__=${JSON.stringify(buildTime)}`;

await $`bun build --compile --minify --define ${define} src/index.ts --outfile ${outfile}`;

console.log(`Compiled ${outfile} (built ${buildTime})`);
