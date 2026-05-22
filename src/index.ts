#!/usr/bin/env bun
import { runBrainstorm } from "./commands/brainstorm.ts";
import { runInit } from "./commands/init.ts";
import { runTask } from "./commands/task.ts";
import { CliError, out } from "./lib/cli.ts";
import { versionString } from "./version.ts";

const USAGE = `workflow — a brainstorm → plan → implement workflow CLI

Usage:
  workflow init                 Scaffold extras/ and docs/ into this project
  workflow brainstorm <cmd>     Manage brainstorm notes (new, list)
  workflow task <cmd>           Manage tasks (create, list, get, update, delete)

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
      case "brainstorm":
        runBrainstorm(rest);
        return 0;
      case "task":
        runTask(rest);
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
