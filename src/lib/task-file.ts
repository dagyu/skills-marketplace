/**
 * A task is a markdown note in `extras/tasks/` whose status lives in a one-line
 * frontmatter block:
 *
 *   ---
 *   status: ready
 *   ---
 *   # Title
 *
 * `brainstorm` is a raw idea, still open to refinement; `ready` is a specified
 * task that can be batched. Batch execution state is not stored here — the batch
 * owns that. A note with no status line counts as a brainstorm, so it can never
 * be batched by accident.
 */
import { CliError } from "./cli.ts";
import type { TaskStatus } from "../types.ts";

export const TASK_STATUSES: readonly TaskStatus[] = ["brainstorm", "ready"];

/** Sections a task must fill in before it may be marked ready. */
export const READY_SECTIONS = ["Goal", "Approach", "Where it lives", "Out of scope"] as const;

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

/** The note's status; a missing or unrecognised one reads as `brainstorm`. */
export function readStatus(markdown: string): TaskStatus {
  const block = FRONTMATTER.exec(markdown);
  const line = block?.[1]?.split("\n").find((l) => l.startsWith("status:"));
  const value = line?.slice("status:".length).trim() ?? "";
  return isTaskStatus(value) ? value : "brainstorm";
}

/** The markdown with its status set, leaving the rest of the frontmatter alone. */
export function withStatus(markdown: string, status: TaskStatus): string {
  const block = FRONTMATTER.exec(markdown);
  if (!block) return `---\nstatus: ${status}\n---\n${markdown}`;
  const lines = block[1]!.split("\n").filter((l) => !l.startsWith("status:"));
  lines.unshift(`status: ${status}`);
  return `---\n${lines.join("\n")}\n---\n${markdown.slice(block[0].length)}`;
}

/** Initial content of a new task: a short idea skeleton, no implementation detail. */
export function newTaskContent(title: string): string {
  return withStatus(`# ${title}\n\n## Idea\n\n## Why\n\n## Open questions\n\n`, "brainstorm");
}

/** Required sections that are missing or empty. */
export function missingSections(markdown: string): string[] {
  const body = markdown.replace(FRONTMATTER, "");
  return READY_SECTIONS.filter((name) => {
    const heading = new RegExp(`^##\\s+${name}\\s*$`, "im").exec(body);
    if (!heading) return true;
    const after = body.slice(heading.index + heading[0].length);
    const next = after.search(/^#{1,2}\s/m);
    return (next === -1 ? after : after.slice(0, next)).trim() === "";
  });
}

/** Throw unless the note is specified enough to be marked ready. */
export function assertReady(markdown: string): void {
  const missing = missingSections(markdown);
  if (missing.length > 0) {
    throw new CliError(
      `Not ready: fill in ${missing.map((s) => `"${s}"`).join(", ")} first. ` +
        "A ready task must be implementable from the note alone.",
    );
  }
}
