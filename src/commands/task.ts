import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { CliError, out } from "../lib/cli.ts";
import { extractTitle, listMarkdown } from "../lib/markdown.ts";
import { resolveProjectPaths, taskPath } from "../lib/paths.ts";
import { slugify } from "../lib/slug.ts";
import {
  TASK_STATUSES,
  assertReady,
  isTaskStatus,
  newTaskContent,
  readStatus,
  withStatus,
} from "../lib/task-file.ts";

const USAGE = `Usage:
  workflow task new <title>               Create a task as a brainstorm (a raw idea)
  workflow task list [--status <status>]  List tasks and their status
  workflow task set <name> <status>       Set the status: ${TASK_STATUSES.join(" | ")}
  workflow task delete <name>             Delete a task (by title or slug)`;

export function runTask(args: string[]): void {
  const [sub, ...rest] = args;
  switch (sub) {
    case "new":
      return taskNew(rest);
    case "list":
      return taskList(rest);
    case "set":
      return taskSet(rest);
    case "delete":
      return taskDelete(rest);
    default:
      throw new CliError(`Unknown task command "${sub ?? ""}".\n${USAGE}`);
  }
}

function taskFile(slug: string): string {
  const file = join(resolveProjectPaths().tasksDir, `${slug}.md`);
  if (!existsSync(file)) {
    throw new CliError(`No task "${slug}" (looked for ${taskPath(slug)}).`);
  }
  return file;
}

function taskNew(rest: string[]): void {
  const title = rest.join(" ").trim();
  if (!title) throw new CliError("A title is required: workflow task new <title>");

  const p = resolveProjectPaths();
  mkdirSync(p.tasksDir, { recursive: true });
  const file = join(p.tasksDir, `${slugify(title)}.md`);
  if (existsSync(file)) throw new CliError(`Task already exists: ${file}`);
  writeFileSync(file, newTaskContent(title), "utf8");
  out(file);
}

function taskList(rest: string[]): void {
  const { values } = parseArgs({
    args: rest,
    options: { status: { type: "string" } },
    allowPositionals: false,
  });
  if (values.status !== undefined && !isTaskStatus(values.status)) {
    throw new CliError(`Unknown status "${values.status}". Use: ${TASK_STATUSES.join(", ")}.`);
  }
  const p = resolveProjectPaths();
  const entries = listMarkdown(p.tasksDir)
    .map((e) => ({ ...e, status: readStatus(readFileSync(join(p.tasksDir, e.file), "utf8")) }))
    .filter((e) => values.status === undefined || e.status === values.status);
  if (entries.length === 0) {
    out(values.status ? `No ${values.status} tasks.` : "No tasks yet.");
    return;
  }
  for (const e of entries) {
    out(`${e.status.padEnd(10)} ${e.title}\n  ${taskPath(basename(e.file, ".md"))}`);
  }
}

function taskSet(rest: string[]): void {
  const status = rest[rest.length - 1];
  const name = rest.slice(0, -1).join(" ").trim();
  if (!name || !status) throw new CliError("Usage: workflow task set <name> <status>");
  if (!isTaskStatus(status)) {
    throw new CliError(`Unknown status "${status}". Use: ${TASK_STATUSES.join(", ")}.`);
  }
  const slug = slugify(name);
  const file = taskFile(slug);
  const content = readFileSync(file, "utf8");
  if (status === "ready") assertReady(content);
  writeFileSync(file, withStatus(content, status), "utf8");
  out(`${extractTitle(content) ?? slug} → ${status}`);
}

function taskDelete(rest: string[]): void {
  const name = rest.join(" ").trim();
  if (!name) throw new CliError("A task name is required: workflow task delete <name>");
  const slug = slugify(name);
  rmSync(taskFile(slug));
  out(`Deleted ${taskPath(slug)}`);
}
