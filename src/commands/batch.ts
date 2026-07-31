import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { BatchStore } from "../lib/batch-store.ts";
import { CliError, out } from "../lib/cli.ts";
import { extractTitle } from "../lib/markdown.ts";
import { notePath, resolveProjectPaths } from "../lib/paths.ts";
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
  workflow batch clear                     Archive the batch to the history, freeing the slot
  workflow batch history [--json]          Show past runs, their timings and commits`;

function store(): BatchStore {
  const p = resolveProjectPaths();
  return new BatchStore(p.batchFile, p.historyFile);
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
    case "history":
      return batchHistory(rest);
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
    throw new CliError(`No brainstorm note "${slug}" (looked for ${notePath(slug)}).`);
  }
  return { title: extractTitle(readFileSync(file, "utf8")) ?? slug, slug };
}

/** A task as the agent consumes it: the stored record plus its derived spec path. */
function withPath(task: BatchTask): BatchTask & { path: string } {
  return { ...task, path: notePath(task.slug) };
}

/** "45s", "3m 20s", "1h 04m" — compact enough to sit at the end of a task line. */
export function formatSeconds(seconds: number | undefined): string {
  if (seconds === undefined) return "";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${pad(seconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
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
    out(JSON.stringify(batch ? { ...batch, tasks: batch.tasks.map(withPath) } : null, null, 2));
    return;
  }
  if (!batch) {
    out("No batch. Create one with `workflow batch create <name…>`.");
    return;
  }
  out(`Batch: ${batch.status} (created ${iso(batch.createdAt)})`);
  printTasks(batch);

  const next = batch.tasks.find((t) => t.status === "pending");
  if (batch.status === "completed") {
    out("\nAll tasks finished. Run `workflow batch clear` to archive it and free the slot.");
  } else if (batch.status === "stopped") {
    out("\nStopped. `workflow batch resume` to continue, or `workflow batch clear` to drop it.");
  } else if (next) {
    out(`\nNext: #${next.id}  ${next.title}`);
  }
}

function printTasks(batch: Batch): void {
  for (const t of batch.tasks) {
    const took = t.seconds !== undefined ? `  ${formatSeconds(t.seconds)}` : "";
    const commit = t.commit ? `  → ${t.commit}` : "";
    const note = t.note ? `  (${t.note})` : "";
    out(`  #${t.id}  ${t.status.padEnd(11)} ${t.title}${took}${commit}${note}`);
  }
}

function iso(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString();
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
    out(JSON.stringify(task ? withPath(task) : null, null, 2));
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
  out(`  spec:   ${notePath(t.slug)}`);
  if (t.seconds !== undefined) out(`  took:   ${formatSeconds(t.seconds)}`);
  if (t.commit) out(`  commit: ${t.commit}`);
  if (t.note) out(`  note:   ${t.note}`);
}

function batchStart(rest: string[]): void {
  const task = store().start(requireId(rest[0]));
  out(`Started #${task.id}  ${task.title}`);
  out(`  spec: ${notePath(task.slug)}`);
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
  out(
    `Done #${task.id}  ${task.title}  (${formatSeconds(task.seconds)})` +
      (task.commit ? `  → ${task.commit}` : ""),
  );
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
  out("Batch archived to extras/batch/history.");

  // The brainstorm folder is a queue, not an archive: a note whose design shipped
  // is spent, while anything not implemented stays queued for a future batch.
  for (const task of batch.tasks) {
    const rel = notePath(task.slug);
    const file = join(p.root, rel);
    if (!existsSync(file)) continue;
    if (task.status === "done") {
      rmSync(file);
      out(`  deleted ${rel} (implemented)`);
    } else {
      out(`  kept    ${rel} (${task.status})`);
    }
  }
}

function batchHistory(rest: string[]): void {
  const { values } = parseArgs({
    args: rest,
    options: { json: { type: "boolean" } },
    allowPositionals: false,
  });
  const runs = store().history();

  if (values.json) {
    out(JSON.stringify(runs, null, 2));
    return;
  }
  if (runs.length === 0) {
    out("No finished runs yet. A batch is archived when you `workflow batch clear` it.");
    return;
  }
  for (const run of runs) {
    const total = run.tasks.reduce((sum, t) => sum + (t.seconds ?? 0), 0);
    const shipped = run.tasks.filter((t) => t.status === "done").length;
    out(
      `\nRun ${iso(run.createdAt)} — ${run.status}, ` +
        `${shipped}/${run.tasks.length} shipped in ${formatSeconds(total)}`,
    );
    printTasks(run);
  }
}
