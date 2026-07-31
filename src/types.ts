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
  /** Slug of the source brainstorm note, which is the task's spec. */
  slug: string;
  /** The note's heading, kept so history stays readable after the note is gone. */
  title: string;
  status: BatchTaskStatus;
  /** Epoch seconds at which the task started. */
  startedAt?: number;
  /** How long the task took, in seconds. Recorded when it finishes. */
  seconds?: number;
  /** Commit that implemented the task, recorded by `batch done --commit`. */
  commit?: string;
  /** Why the task failed, or how it was interrupted. */
  note?: string;
}

/**
 * One batch run. At most one is live at a time (in `extras/batch/batch`);
 * finished runs are appended to `extras/batch/history`.
 */
export interface Batch {
  status: BatchStatus;
  /** Epoch seconds at creation. Doubles as the run's id in the history file. */
  createdAt: number;
  tasks: BatchTask[];
}

/** One entry of `batch create`, resolved from a brainstorm note. */
export interface BatchTaskSpec {
  title: string;
  slug: string;
}
