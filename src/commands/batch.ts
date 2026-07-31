import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { BatchStore } from "../lib/batch-store.ts";
import { CliError, out } from "../lib/cli.ts";
import { extractTitle } from "../lib/markdown.ts";
import { resolveProjectPaths } from "../lib/paths.ts";
import { slugify } from "../lib/slug.ts";
import type { Batch, BatchTask, BatchTaskSpec } from "../types.ts";

const USAGE = `Usage:
  workflow batch create <name…>            Queue brainstorm notes as tasks, in execution order
  workflow batch status [--json]           Show the batch and its tasks
  workflow batch next [--json]             Print the task to execute next
  workflow batch start <id>                Mark a task in progress (must be the next one)
  workflow batch done <id> [--commit <sha>]  Mark a task implemented
  workflow batch fail <id> --reason <why>  Mark a task failed; stops the batch
  workflow batch stop [--reason <why>]     Halt execution (an in-progress task returns to pending)
  workflow batch resume                    Resume a stopped batch
  workflow batch remove <id…>              Drop not-yet-started tasks from the queue
  workflow batch revert <id>               Mark a done task reverted; prints the git command to undo it
  workflow batch clear                     Delete the batch, freeing the slot for a new one`;

function store(): BatchStore {
  return new BatchStore(resolveProjectPaths().batchFile);
}

export function runBatch(args: string[]): void {
  const [sub, ...rest] = args;
  switch (sub) {
    case "create":
      return batchCreate(rest);
    case "status":
      return batchStatus(rest);
    case "next":
      return batchNext(rest);
    case "start":
      return batchStart(rest);
    case "done":
      return batchDone(rest);
    case "fail":
      return batchFail(rest);
    case "stop":
      return batchStop(rest);
    case "resume":
      return batchResume();
    case "remove":
      return batchRemove(rest);
    case "revert":
      return batchRevert(rest);
    case "clear":
      return batchClear();
    default:
      throw new CliError(`Unknown batch command "${sub ?? ""}".\n${USAGE}`);
  }
}

function requireId(raw: string | undefined): number {
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) {
    throw new CliError("A numeric task id is required.");
  }
  return id;
}

/** Resolve a note name (title or slug) to a batch task spec, or throw. */
function resolveNote(name: string): BatchTaskSpec {
  const p = resolveProjectPaths();
  const slug = slugify(name);
  const file = join(p.brainstormDir, `${slug}.md`);
  if (!existsSync(file)) {
    throw new CliError(`No brainstorm note "${slug}" (looked for extras/brainstorm/${slug}.md).`);
  }
  const title = extractTitle(readFileSync(file, "utf8")) ?? slug;
  return { title, slug, path: relative(p.root, file) };
}

function batchCreate(rest: string[]): void {
  const names = rest.map((s) => s.trim()).filter((s) => s.length > 0);
  if (names.length === 0) {
    throw new CliError(
      "At least one brainstorm note is required: workflow batch create <name…>\n" +
        "List them in the order they should be executed.",
    );
  }
  const specs = names.map(resolveNote);
  const seen = new Set<string>();
  for (const spec of specs) {
    if (seen.has(spec.slug)) throw new CliError(`"${spec.slug}" is listed twice.`);
    seen.add(spec.slug);
  }

  const batch = store().create(specs);
  out(`Batch created with ${batch.tasks.length} task(s), in this order:`);
  printTasks(batch);
  out("\nRun `workflow batch next` to see what to execute first.");
}

function batchStatus(rest: string[]): void {
  const { values } = parseArgs({
    args: rest,
    options: { json: { type: "boolean" } },
    allowPositionals: false,
  });
  const batch = store().read();

  if (values.json) {
    out(JSON.stringify(batch ?? null, null, 2));
    return;
  }
  if (!batch) {
    out("No batch. Create one with `workflow batch create <name…>`.");
    return;
  }
  out(`Batch: ${batch.status} (created ${batch.createdAt})`);
  printTasks(batch);

  const next = batch.tasks.find((t) => t.status === "pending");
  if (batch.status === "completed") {
    out("\nAll tasks finished. Run `workflow batch clear` to free the slot for a new batch.");
  } else if (batch.status === "stopped") {
    out("\nStopped. `workflow batch resume` to continue, or `workflow batch clear` to drop it.");
  } else if (next) {
    out(`\nNext: #${next.id}  ${next.title}`);
  }
}

function printTasks(batch: Batch): void {
  for (const t of batch.tasks) {
    const commit = t.commit ? `  → ${t.commit}` : "";
    const note = t.note ? `  (${t.note})` : "";
    out(`  #${t.id}  ${t.status.padEnd(11)} ${t.title}${commit}${note}`);
  }
}

function batchNext(rest: string[]): void {
  const { values } = parseArgs({
    args: rest,
    options: { json: { type: "boolean" } },
    allowPositionals: false,
  });
  const st = store();
  const task = st.next();

  if (values.json) {
    out(JSON.stringify(task ?? null, null, 2));
    return;
  }
  if (task) {
    printTask(task);
    return;
  }
  const batch = st.read();
  if (!batch) out("No batch.");
  else if (batch.status !== "active") out(`Nothing to run — the batch is ${batch.status}.`);
  else out("Nothing to run — no pending tasks.");
}

function printTask(t: BatchTask): void {
  out(`#${t.id}  ${t.title}`);
  out(`  status: ${t.status}`);
  out(`  spec:   ${t.path}`);
  if (t.commit) out(`  commit: ${t.commit}`);
  if (t.note) out(`  note:   ${t.note}`);
}

function batchStart(rest: string[]): void {
  const task = store().start(requireId(rest[0]));
  out(`Started #${task.id}  ${task.title}`);
  out(`  spec: ${task.path}`);
}

function batchDone(rest: string[]): void {
  const { values, positionals } = parseArgs({
    args: rest,
    options: { commit: { type: "string" } },
    allowPositionals: true,
  });
  const task = store().finish(requireId(positionals[0]), {
    status: "done",
    commit: values.commit,
  });
  out(`Done #${task.id}  ${task.title}${task.commit ? `  → ${task.commit}` : ""}`);
}

function batchFail(rest: string[]): void {
  const { values, positionals } = parseArgs({
    args: rest,
    options: { reason: { type: "string" } },
    allowPositionals: true,
  });
  if (!values.reason) throw new CliError("--reason is required when failing a task.");
  const task = store().finish(requireId(positionals[0]), {
    status: "failed",
    note: values.reason,
  });
  out(`Failed #${task.id}  ${task.title}: ${task.note}`);
  out("The batch is stopped. Report this to the developer before doing anything else.");
}

function batchStop(rest: string[]): void {
  const { values } = parseArgs({
    args: rest,
    options: { reason: { type: "string" } },
    allowPositionals: false,
  });
  const batch = store().stop(values.reason);
  out("Batch stopped.");
  printTasks(batch);
}

function batchResume(): void {
  const batch = store().resume();
  out("Batch resumed.");
  const next = batch.tasks.find((t) => t.status === "pending");
  if (next) out(`Next: #${next.id}  ${next.title}`);
}

function batchRemove(rest: string[]): void {
  if (rest.length === 0) throw new CliError("At least one task id is required.");
  const removed = store().remove(rest.map(requireId));
  for (const t of removed) out(`Removed #${t.id}  ${t.title}`);
  out("Their brainstorm notes are untouched — they stay in extras/brainstorm/.");
}

function batchRevert(rest: string[]): void {
  const task = store().revert(requireId(rest[0]));
  out(`Marked #${task.id} ("${task.title}") reverted.`);
  if (task.commit) {
    out(`Undo its code with:\n  git revert --no-edit ${task.commit}`);
  } else {
    out("No commit was recorded for it — undo its code by hand.");
  }
}

function batchClear(): void {
  const p = resolveProjectPaths();
  const batch = store().clear();
  if (!batch) {
    out("No batch to clear.");
    return;
  }
  out("Batch cleared.");

  // The brainstorm folder is a queue, not an archive: a note whose design shipped
  // is spent, while anything not implemented stays queued for a future batch.
  for (const task of batch.tasks) {
    const file = join(p.root, task.path);
    if (task.status === "done" && existsSync(file)) {
      rmSync(file);
      out(`  deleted ${task.path} (implemented)`);
    } else if (existsSync(file)) {
      out(`  kept    ${task.path} (${task.status})`);
    }
  }
}
