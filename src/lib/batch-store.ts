import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { decodeBatch, decodeBatches, encodeBatch } from "./batch-format.ts";
import { CliError } from "./cli.ts";
import type { Batch, BatchTask, BatchTaskSpec, BatchTaskStatus } from "../types.ts";

/** Statuses a task can no longer move out of. */
const TERMINAL: BatchTaskStatus[] = ["done", "failed", "reverted"];

/** Epoch seconds — the unit every time in a batch is recorded in. */
function now(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * The only module that reads or writes extras/batch/ — the live batch and the
 * run history. Both are in the line-oriented format from batch-format.ts.
 *
 * It enforces the rules that make a batch safe to run unattended: at most one
 * batch exists at a time, tasks start strictly in order, and only one task is in
 * progress at any moment.
 *
 * Constructed with the two absolute paths so it is trivially testable against a
 * temp directory.
 */
export class BatchStore {
  private readonly file: string;
  private readonly historyFile: string;

  constructor(file: string, historyFile: string) {
    this.file = file;
    this.historyFile = historyFile;
  }

  /** The current batch, or undefined when none exists. */
  read(): Batch | undefined {
    if (!existsSync(this.file)) return undefined;
    return decodeBatch(readFileSync(this.file, "utf8"));
  }

  /** The current batch, or a CliError explaining that there is none. */
  require(): Batch {
    const batch = this.read();
    if (!batch) {
      throw new CliError("No batch. Create one with `workflow batch create <slug…>`.");
    }
    return batch;
  }

  /** Every finished run, oldest first. */
  history(): Batch[] {
    if (!existsSync(this.historyFile)) return [];
    return decodeBatches(readFileSync(this.historyFile, "utf8"));
  }

  private write(batch: Batch): Batch {
    if (batch.status === "active" && !batch.tasks.some((t) => !isTerminal(t))) {
      batch.status = "completed";
    }
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, encodeBatch(batch), "utf8");
    return batch;
  }

  /**
   * Start a new batch. Refuses while another exists — a batch is a lock: no new
   * one until the current one is finished and cleared.
   */
  create(specs: BatchTaskSpec[]): Batch {
    if (specs.length === 0) {
      throw new CliError("A batch needs at least one brainstorm note.");
    }
    const existing = this.read();
    if (existing) {
      throw new CliError(
        existing.status === "completed"
          ? "A finished batch is still on disk. Review it, then run `workflow batch clear`."
          : `A batch is already ${existing.status}. Stop it and run \`workflow batch clear\` before creating another.`,
      );
    }
    return this.write({
      status: "active",
      createdAt: now(),
      tasks: specs.map((spec, index) => ({
        id: index + 1,
        slug: spec.slug,
        title: spec.title,
        status: "pending",
      })),
    });
  }

  /**
   * Append the batch to the history and delete the live file. Returns the
   * archived batch, or undefined if there was none.
   */
  clear(): Batch | undefined {
    const batch = this.read();
    if (!batch) return undefined;
    if (batch.status === "active") {
      throw new CliError(
        "The batch is still active. Run `workflow batch stop` first, then clear it.",
      );
    }
    mkdirSync(dirname(this.historyFile), { recursive: true });
    appendFileSync(this.historyFile, encodeBatch(batch), "utf8");
    rmSync(this.file);
    return batch;
  }

  /** The task to execute next: the first pending one, only while active. */
  next(): BatchTask | undefined {
    const batch = this.read();
    if (!batch || batch.status !== "active") return undefined;
    return batch.tasks.find((t) => t.status === "pending");
  }

  /** The task currently being implemented, if any. */
  current(): BatchTask | undefined {
    return this.read()?.tasks.find((t) => t.status === "in-progress");
  }

  /**
   * Mark a task in progress. Only the next pending task may start, and only one
   * at a time — that is what keeps a batch sequential.
   */
  start(id: number): BatchTask {
    const batch = this.require();
    if (batch.status !== "active") {
      throw new CliError(
        `The batch is ${batch.status}. Run \`workflow batch resume\` before starting a task.`,
      );
    }
    const task = find(batch, id);
    const running = batch.tasks.find((t) => t.status === "in-progress");
    if (running) {
      throw new CliError(
        `Task #${running.id} ("${running.title}") is already in progress — one task at a time.`,
      );
    }
    if (task.status !== "pending") {
      throw new CliError(`Task #${id} is ${task.status}, not pending.`);
    }
    const next = batch.tasks.find((t) => t.status === "pending");
    if (next && next.id !== id) {
      throw new CliError(
        `Tasks run in order: #${next.id} ("${next.title}") is next, not #${id}.`,
      );
    }
    task.status = "in-progress";
    task.startedAt = now();
    delete task.seconds;
    delete task.note;
    this.write(batch);
    return task;
  }

  /** Close out the in-progress task as done or failed. Failing stops the batch. */
  finish(
    id: number,
    result: { status: "done" | "failed"; commit?: string; note?: string },
  ): BatchTask {
    const batch = this.require();
    const task = find(batch, id);
    if (task.status !== "in-progress") {
      throw new CliError(`Task #${id} is ${task.status}, not in progress.`);
    }
    task.status = result.status;
    task.seconds = Math.max(0, now() - (task.startedAt ?? now()));
    if (result.commit) task.commit = result.commit;
    if (result.note) task.note = result.note;
    if (result.status === "failed" && batch.status === "active") {
      batch.status = "stopped";
    }
    this.write(batch);
    return task;
  }

  /**
   * Halt execution. An in-progress task returns to pending so a resumed batch
   * re-runs it from a known state.
   */
  stop(reason?: string): Batch {
    const batch = this.require();
    if (batch.status !== "active") {
      throw new CliError(`The batch is already ${batch.status}.`);
    }
    const running = batch.tasks.find((t) => t.status === "in-progress");
    if (running) {
      running.status = "pending";
      delete running.startedAt;
      running.note = reason ? `interrupted: ${reason}` : "interrupted by stop";
    }
    batch.status = "stopped";
    return this.write(batch);
  }

  /** Resume a stopped batch. Failed tasks stay failed; the run picks up the next pending one. */
  resume(): Batch {
    const batch = this.require();
    if (batch.status === "completed") {
      throw new CliError("The batch is completed — nothing left to resume.");
    }
    if (batch.status === "active") {
      throw new CliError("The batch is already active.");
    }
    if (!batch.tasks.some((t) => t.status === "pending")) {
      throw new CliError("No pending tasks left to resume.");
    }
    batch.status = "active";
    return this.write(batch);
  }

  /** Drop not-yet-started tasks from the queue. */
  remove(ids: number[]): BatchTask[] {
    const batch = this.require();
    const removed = ids.map((id) => {
      const task = find(batch, id);
      if (task.status !== "pending") {
        throw new CliError(
          `Only pending tasks can be removed; #${id} is ${task.status}.`,
        );
      }
      return task;
    });
    batch.tasks = batch.tasks.filter((t) => !removed.includes(t));
    this.write(batch);
    return removed;
  }

  /**
   * Mark a done task as reverted. The commit is kept so the caller can undo it;
   * this store never touches git.
   */
  revert(id: number): BatchTask {
    const batch = this.require();
    const task = find(batch, id);
    if (task.status !== "done") {
      throw new CliError(`Only done tasks can be reverted; #${id} is ${task.status}.`);
    }
    task.status = "reverted";
    this.write(batch);
    return task;
  }
}

function find(batch: Batch, id: number): BatchTask {
  const task = batch.tasks.find((t) => t.id === id);
  if (!task) throw new CliError(`No task #${id} in the batch.`);
  return task;
}

function isTerminal(task: BatchTask): boolean {
  return TERMINAL.includes(task.status);
}
