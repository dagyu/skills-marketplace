/**
 * The on-disk format for batches, in `extras/batch/`.
 *
 * These files live in git and are rewritten on every task transition, so the
 * format is line-oriented and tab-separated rather than JSON: one record per
 * line means a status change is a one-line diff, and there are no braces,
 * quotes, or repeated key names to pay for.
 *
 *   b<TAB>status<TAB>created
 *   t<TAB>id<TAB>status<TAB>slug<TAB>title<TAB>started<TAB>seconds<TAB>commit<TAB>note
 *
 * A `b` record opens a batch; the `t` records that follow belong to it, in
 * execution order. The history file is simply many of these blocks, appended.
 *
 * Times are epoch seconds, and a task records how long it took rather than a
 * second timestamp. Statuses are single letters. Absent trailing fields are
 * dropped, so a queued task costs five short fields.
 *
 * Everything else in the codebase works with the `Batch` type; this module is
 * the only place that knows how it is spelled on disk.
 */
import { CliError } from "./cli.ts";
import type { Batch, BatchStatus, BatchTask, BatchTaskStatus } from "../types.ts";

const BATCH_CODE: Record<BatchStatus, string> = {
  active: "a",
  stopped: "s",
  completed: "c",
};

const TASK_CODE: Record<BatchTaskStatus, string> = {
  pending: "p",
  "in-progress": "r",
  done: "d",
  failed: "f",
  reverted: "v",
};

const BATCH_STATUS = invert(BATCH_CODE);
const TASK_STATUS = invert(TASK_CODE);

/** Placeholder for an absent field; a lone "-" never means a real value. */
const NONE = "-";

/** Render one batch as a block of records, newline-terminated. */
export function encodeBatch(batch: Batch): string {
  const lines = [["b", BATCH_CODE[batch.status], String(batch.createdAt)].join("\t")];
  for (const t of batch.tasks) {
    lines.push(
      trimFields([
        "t",
        String(t.id),
        TASK_CODE[t.status],
        t.slug,
        esc(t.title),
        num(t.startedAt),
        num(t.seconds),
        text(t.commit),
        text(t.note),
      ]).join("\t"),
    );
  }
  return lines.join("\n") + "\n";
}

/**
 * Parse every batch block in a file, oldest first. Blank lines and `#` comments
 * are ignored. Throws on a malformed record rather than guessing.
 */
export function decodeBatches(contents: string): Batch[] {
  const batches: Batch[] = [];
  let current: Batch | undefined;

  contents.split("\n").forEach((line, index) => {
    if (line.trim() === "" || line.startsWith("#")) return;
    const fields = line.split("\t");
    const at = `line ${index + 1}`;

    if (fields[0] === "b") {
      current = {
        status: lookup(BATCH_STATUS, fields[1], `batch status`, at),
        createdAt: int(fields[2], "created", at),
        tasks: [],
      };
      batches.push(current);
      return;
    }
    if (fields[0] === "t") {
      if (!current) throw new CliError(`Malformed batch file: task before any batch (${at}).`);
      current.tasks.push(decodeTask(fields, at));
      return;
    }
    throw new CliError(`Malformed batch file: unknown record "${fields[0]}" (${at}).`);
  });

  return batches;
}

/** Parse a file holding a single batch; undefined when it holds none. */
export function decodeBatch(contents: string): Batch | undefined {
  return decodeBatches(contents)[0];
}

function decodeTask(fields: string[], at: string): BatchTask {
  const task: BatchTask = {
    id: int(fields[1], "task id", at),
    status: lookup(TASK_STATUS, fields[2], "task status", at),
    slug: required(fields[3], "slug", at),
    title: unesc(required(fields[4], "title", at)),
  };
  const startedAt = optionalInt(fields[5], "started", at);
  const seconds = optionalInt(fields[6], "seconds", at);
  const commit = optional(fields[7]);
  const note = optional(fields[8]);
  if (startedAt !== undefined) task.startedAt = startedAt;
  if (seconds !== undefined) task.seconds = seconds;
  if (commit !== undefined) task.commit = commit;
  if (note !== undefined) task.note = unesc(note);
  return task;
}

/** Drop trailing absent fields — a queued task needs only five. */
function trimFields(fields: string[]): string[] {
  let end = fields.length;
  while (end > 0 && fields[end - 1] === NONE) end--;
  return fields.slice(0, end);
}

function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n");
}

function unesc(value: string): string {
  return value.replace(/\\([\\tn])/g, (_, c: string) =>
    c === "t" ? "\t" : c === "n" ? "\n" : "\\",
  );
}

function text(value: string | undefined): string {
  return value === undefined || value === "" ? NONE : esc(value);
}

function num(value: number | undefined): string {
  return value === undefined ? NONE : String(value);
}

function optional(field: string | undefined): string | undefined {
  return field === undefined || field === NONE || field === "" ? undefined : field;
}

function required(field: string | undefined, name: string, at: string): string {
  const value = optional(field);
  if (value === undefined) throw new CliError(`Malformed batch file: missing ${name} (${at}).`);
  return value;
}

function int(field: string | undefined, name: string, at: string): number {
  return parseInt10(required(field, name, at), name, at);
}

function optionalInt(field: string | undefined, name: string, at: string): number | undefined {
  const value = optional(field);
  return value === undefined ? undefined : parseInt10(value, name, at);
}

function parseInt10(value: string, name: string, at: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new CliError(`Malformed batch file: ${name} "${value}" is not a whole number (${at}).`);
  }
  return n;
}

function lookup<T extends string>(
  table: Record<string, T>,
  code: string | undefined,
  name: string,
  at: string,
): T {
  const value = code === undefined ? undefined : table[code];
  if (value === undefined) throw new CliError(`Malformed batch file: unknown ${name} "${code ?? ""}" (${at}).`);
  return value;
}

function invert<T extends string>(codes: Record<T, string>): Record<string, T> {
  return Object.fromEntries(Object.entries(codes).map(([k, v]) => [v as string, k as T]));
}
