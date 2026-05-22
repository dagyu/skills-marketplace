import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { CliError, oneOf, out, parseList } from "../lib/cli.ts";
import { resolveProjectPaths } from "../lib/paths.ts";
import { TaskStore } from "../lib/store.ts";
import { PRIORITIES, STATUSES, type Task } from "../types.ts";

const USAGE = `Usage:
  workflow task create --title <t> [--description <d>] [--priority low|medium|high] [--labels a,b] [--body-file <path>]
  workflow task list [--status <s>] [--priority <p>] [--label <l>] [--json]
  workflow task get <id> [--json]
  workflow task update <id> [--title <t>] [--description <d>] [--priority <p>] [--labels a,b] [--status <s>]
  workflow task delete <id>`;

function store(): TaskStore {
  return new TaskStore(resolveProjectPaths().dataFile);
}

export function runTask(args: string[]): void {
  const [sub, ...rest] = args;
  switch (sub) {
    case "create":
      return taskCreate(rest);
    case "list":
      return taskList(rest);
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
      "body-file": { type: "string" },
    },
    allowPositionals: false,
  });

  if (!values.title) throw new CliError("--title is required.");
  const priority = oneOf(values.priority, PRIORITIES, "--priority");

  const p = resolveProjectPaths();
  const task = store().create({
    title: values.title,
    description: values.description,
    priority,
    labels: parseList(values.labels),
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
    out(`#${t.id}  ${t.status.padEnd(11)} ${t.priority.padEnd(6)} ${t.title}${labels}`);
  }
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
