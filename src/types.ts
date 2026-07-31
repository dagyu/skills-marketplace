/** Types for batch execution — a queue of brainstorm notes run back to back. */

export type BatchTaskStatus =
  | "pending"
  | "in-progress"
  | "done"
  | "failed"
  | "reverted";

/**
 * `active` — the batch may execute; `stopped` — halted by the developer or by a
 * failure, resumable; `completed` — every task reached a terminal state.
 */
export type BatchStatus = "active" | "stopped" | "completed";

export interface BatchTask {
  /** Stable label, assigned at creation. Execution order is the array order. */
  id: number;
  title: string;
  /** Slug of the source brainstorm note. */
  slug: string;
  /** Project-relative path to the note, which is the task's spec. */
  path: string;
  status: BatchTaskStatus;
  /** Commit that implemented the task, recorded by `batch done --commit`. */
  commit?: string;
  /** Why the task failed, or how it was interrupted. */
  note?: string;
  /** ISO timestamp. */
  startedAt?: string;
  /** ISO timestamp. */
  finishedAt?: string;
}

/** On-disk shape of extras/batch/batch.json. At most one batch exists at a time. */
export interface Batch {
  status: BatchStatus;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
  tasks: BatchTask[];
}

/** One entry of `batch create`, resolved from a brainstorm note. */
export interface BatchTaskSpec {
  title: string;
  slug: string;
  path: string;
}
