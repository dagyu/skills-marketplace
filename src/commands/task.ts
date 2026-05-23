import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { CliError, oneOf, out, parseList } from "../lib/cli.ts";
import { resolveProjectPaths } from "../lib/paths.ts";
import { TaskStore } from "../lib/store.ts";
import { PRIORITIES, STATUSES, type Task } from "../types.ts";

const USAGE = `Usage:
  workflow task create --title <t> [--description <d>] [--priority low|medium|high] [--labels a,b] [--depends-on 1,2] [--body-file <path>]
  workflow task list [--status <s>] [--priority <p>] [--label <l>] [--json]
  workflow task current
  workflow task get <id> [--json]
  workflow task update <id> [--title <t>] [--description <d>] [--priority <p>] [--labels a,b] [--depends-on 1,2] [--status <s>]
  workflow task delete <id>`;

function store(): TaskStore {
  return new TaskStore(resolveProjectPaths().dataFile);
}

/**
 * Parse a `--depends-on` value into task ids. Returns undefined when the flag is
 * absent (leave dependencies unchanged), and [] for an explicit empty value
 * (clear them). Validates that each id is a positive integer, refers to an
 * existing task, and is not the task itself.
 */
function parseDependsOn(raw: string | undefined, selfId?: number): number[] | undefined {
  if (raw === undefined) return undefined;
  const st = store();
  return parseList(raw).map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n) || n <= 0) {
      throw new CliError(`Invalid --depends-on id "${s}". Expected positive task ids.`);
    }
    if (selfId !== undefined && n === selfId) {
      throw new CliError(`A task cannot depend on itself (#${selfId}).`);
    }
    if (!st.get(n)) {
      throw new CliError(`--depends-on references unknown task #${n}.`);
    }
    return n;
  });
}

export function runTask(args: string[]): void {
  const [sub, ...rest] = args;
  switch (sub) {
    case "create":
      return taskCreate(rest);
    case "list":
      return taskList(rest);
    case "current":
      return taskCurrent();
    case "get":
      return taskGet(rest);
    case "update":
      return taskUpdate(rest);
    case "delete":
      return taskDelete(rest);
    default:
      throw new CliError(`Unknown task command "${sub ?? ""}".\n${USAGE}`);
  }
}

function requireId(raw: string | undefined): number {
  const id = Number(raw);
  if (!raw || !Number.isInteger(id)) {
    throw new CliError("A numeric task id is required.");
  }
  return id;
}

function taskCreate(rest: string[]): void {
  const { values } = parseArgs({
    args: rest,
    options: {
      title: { type: "string" },
      description: { type: "string" },
      priority: { type: "string" },
      labels: { type: "string" },
      "depends-on": { type: "string" },
      "body-file": { type: "string" },
    },
    allowPositionals: false,
  });

  if (!values.title) throw new CliError("--title is required.");
  const priority = oneOf(values.priority, PRIORITIES, "--priority");
  const dependsOn = parseDependsOn(values["depends-on"]);

  const p = resolveProjectPaths();
  const task = store().create({
    title: values.title,
    description: values.description,
    priority,
    labels: parseList(values.labels),
    dependsOn,
  });

  // Write the extended-description markdown file.
  const bodyPath = join(p.root, task.path);
  mkdirSync(dirname(bodyPath), { recursive: true });
  const body = values["body-file"]
    ? readFileSync(values["body-file"], "utf8")
    : `# ${task.title}\n\n${task.description}\n`;
  writeFileSync(bodyPath, body, "utf8");

  out(String(task.id));
}

function taskList(rest: string[]): void {
  const { values } = parseArgs({
    args: rest,
    options: {
      status: { type: "string" },
      priority: { type: "string" },
      label: { type: "string" },
      json: { type: "boolean" },
    },
    allowPositionals: false,
  });

  const tasks = store().list({
    status: oneOf(values.status, STATUSES, "--status"),
    priority: oneOf(values.priority, PRIORITIES, "--priority"),
    label: values.label,
  });

  if (values.json) {
    out(JSON.stringify(tasks, null, 2));
    return;
  }
  if (tasks.length === 0) {
    out("No tasks.");
    return;
  }
  for (const t of tasks) {
    const labels = t.labels.length ? ` [${t.labels.join(", ")}]` : "";
    const deps = t.dependsOn?.length ? ` (depends on ${formatDeps(t)})` : "";
    out(`#${t.id}  ${t.status.padEnd(11)} ${t.priority.padEnd(6)} ${t.title}${labels}${deps}`);
  }
}

/** Render a task's dependencies as `#1, #2`, or "" when it has none. */
function formatDeps(t: Task): string {
  return (t.dependsOn ?? []).map((d) => `#${d}`).join(", ");
}

/** Report the task currently in progress — the lock that blocks starting another. */
function taskCurrent(): void {
  const [task] = store().list({ status: "in-progress" });
  if (!task) {
    out("No task in progress. You may start one.");
    return;
  }
  out(`In progress: #${task.id}  ${task.title}`);
  out("Finish (and delete) it before starting another — one task at a time.");
}

function taskGet(rest: string[]): void {
  const { values, positionals } = parseArgs({
    args: rest,
    options: { json: { type: "boolean" } },
    allowPositionals: true,
  });
  const id = requireId(positionals[0]);
  const task = store().get(id);
  if (!task) throw new CliError(`No task with id ${id}.`);

  const p = resolveProjectPaths();
  const bodyPath = join(p.root, task.path);
  const body = existsSync(bodyPath) ? readFileSync(bodyPath, "utf8") : "";

  if (values.json) {
    out(JSON.stringify({ ...task, body }, null, 2));
    return;
  }
  printTask(task);
  if (body.trim()) {
    out("\n--- description ---\n");
    out(body.trimEnd());
  }
}

function printTask(t: Task): void {
  out(`#${t.id}  ${t.title}`);
  out(`  status:      ${t.status}`);
  out(`  priority:    ${t.priority}`);
  out(`  labels:      ${t.labels.join(", ") || "(none)"}`);
  out(`  depends on:  ${formatDeps(t) || "(none — ready)"}`);
  out(`  description: ${t.description || "(none)"}`);
  out(`  path:        ${t.path}`);
  out(`  created:     ${t.createdAt}`);
  out(`  updated:     ${t.updatedAt}`);
}

function taskUpdate(rest: string[]): void {
  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      title: { type: "string" },
      description: { type: "string" },
      priority: { type: "string" },
      labels: { type: "string" },
      "depends-on": { type: "string" },
      status: { type: "string" },
    },
    allowPositionals: true,
  });
  const id = requireId(positionals[0]);

  const updated = store().update(id, {
    title: values.title,
    description: values.description,
    priority: oneOf(values.priority, PRIORITIES, "--priority"),
    status: oneOf(values.status, STATUSES, "--status"),
    labels: values.labels !== undefined ? parseList(values.labels) : undefined,
    dependsOn: parseDependsOn(values["depends-on"], id),
  });
  if (!updated) throw new CliError(`No task with id ${id}.`);
  out(`Updated #${updated.id}.`);
}

function taskDelete(rest: string[]): void {
  const id = requireId(rest[0]);
  const p = resolveProjectPaths();
  const removed = store().delete(id);
  if (!removed) throw new CliError(`No task with id ${id}.`);
  const bodyPath = join(p.root, removed.path);
  rmSync(bodyPath, { force: true });
  out(`Deleted #${removed.id}.`);
}
