#!/usr/bin/env bun
import { runBatch } from "./commands/batch.ts";
import { runInternals, runManifesto } from "./commands/docinfo.ts";
import { runInit } from "./commands/init.ts";
import { runServe } from "./commands/serve.ts";
import { runTask } from "./commands/task.ts";
import { CliError, out } from "./lib/cli.ts";
import { versionString } from "./version.ts";

const USAGE = `workflow — a task → implement workflow CLI

Usage:
  workflow init                 Scaffold extras/ and docs/ into this project
  workflow manifesto info       How to populate extras/manifesto/MANIFESTO.md
  workflow internals info       How to populate extras/internals/INTERNALS.md
  workflow task <cmd>           Manage tasks and their status (new, list, set, delete)
  workflow batch <cmd>          Run a queue of ready tasks back to back (create, status, …)
  workflow serve [--port <n>]   Preview and edit tasks, and watch a batch run, in a browser

Options:
  -v, --version                 Print the version and build time
  -h, --help                    Print this help

Run a subcommand with no arguments to see its own usage.`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  try {
    switch (command) {
      case "-v":
      case "--version":
        out(versionString());
        return 0;
      case "init":
        await runInit();
        return 0;
      case "manifesto":
        await runManifesto(rest);
        return 0;
      case "internals":
        await runInternals(rest);
        return 0;
      case "task":
        runTask(rest);
        return 0;
      case "batch":
        runBatch(rest);
        return 0;
      case "serve":
        await runServe(rest);
        return 0;
      case undefined:
      case "-h":
      case "--help":
      case "help":
        out(USAGE);
        return 0;
      default:
        out(`Unknown command "${command}".\n\n${USAGE}`);
        return 1;
    }
  } catch (err) {
    if (err instanceof CliError) {
      process.stderr.write(`Error: ${err.message}\n`);
      return 1;
    }
    throw err;
  }
}

process.exit(await main(process.argv.slice(2)));
