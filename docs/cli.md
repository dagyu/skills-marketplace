# CLI reference

All commands operate on the current working directory's `extras/` and `docs/`.

## `workflow --version` (`-v`)

Print the version and the build time, e.g.
`workflow 0.1.0 (built 2026-05-22T14:05:13.699Z)`. The version comes from
`package.json` (single source of truth). The build time is injected at compile
time via `bun build --compile --define __BUILD_TIME__=…` (see
[Compiling](#compiling)); running from source reports
`dev (running from source)`.

## Compiling

`bun run compile [outfile]` (default `dist/workflow`) builds a standalone
executable with `bun build --compile`. `scripts/compile.ts` stamps the current
ISO timestamp into the binary. Templates used by `workflow init` are embedded into
the binary via `with { type: "file" }` imports, so the compiled binary is fully
self-contained.

## `workflow init`

Scaffold the workflow structure into the current project: `extras/brainstorm/`,
`extras/manifesto/MANIFESTO.md`, `extras/internals/INTERNALS.md` (the
code-structure map), `docs/`, a starter `README.md`, and a `CLAUDE.md` that points
the agent at the manifesto and the internals map. Idempotent — existing files are
never overwritten.

`MANIFESTO.md` and `INTERNALS.md` are scaffolded as **stubs**, not filled-in
documents: the workflow has no way to know the project's vision or code layout.
Each stub points the agent at the matching `info` command, which it should run
and then act on before any real work — populating the manifesto by interviewing
the developer, and the internals map from the codebase.

## `workflow manifesto` / `workflow internals`

| Command | Description |
|---|---|
| `workflow manifesto info` | Print instructions for writing `extras/manifesto/MANIFESTO.md` — the sections to include and the questions to ask the developer. The agent runs this, then writes the file; it does not invent the vision or guidelines. |
| `workflow internals info` | Print instructions for writing `extras/internals/INTERNALS.md` — the sections to include and what to inspect/confirm. The agent runs this, then writes the file from the actual codebase. |

## `workflow brainstorm`

| Command | Description |
|---|---|
| `workflow brainstorm new "<title>"` | Create `extras/brainstorm/<slug>.md` seeded with the title heading. Prints the path. |
| `workflow brainstorm list` | List notes with their titles. |
| `workflow brainstorm delete "<name>"` | Delete `extras/brainstorm/<slug>.md` (accepts the note's title or slug). Errors non-zero if no such note exists. Use it to clear a note once its design has been implemented. |

## `workflow batch`

A **batch** runs several brainstorm notes back to back, one task at a time. Its
state lives in `extras/batch/batch.json`, written only by `src/lib/batch-store.ts`.
The notes themselves are the task specs — a batch references them, it does not
copy them.

**At most one batch exists at a time.** `create` refuses while another is on disk,
so a new batch is only possible after the current one is stopped or completed and
then cleared. This is what stops a second run being queued on top of a live one.

| Command | Description |
|---|---|
| `workflow batch create "<name>" …` | Queue the named notes (title or slug) as tasks. **Argument order is execution order.** Validates that each note exists and that none is listed twice; assigns each task a stable id. |
| `workflow batch status [--json]` | Print the batch, its status (`active`, `stopped`, `completed`) and every task. `--json` emits the raw record. |
| `workflow batch next [--json]` | Print the next task to execute — the first pending one, and only while the batch is active. |
| `workflow batch start <id>` | Mark a task in progress. Refuses unless it is the next pending task and nothing else is running: this is what keeps a batch sequential. |
| `workflow batch done <id> [--commit <sha>]` | Close the in-progress task as implemented, recording the commit that shipped it. |
| `workflow batch fail <id> --reason <why>` | Close it as failed and stop the batch. `--reason` is required. |
| `workflow batch stop [--reason <why>]` | Halt execution. An in-progress task returns to `pending` (with a note) so a resumed batch re-runs it from a known state. |
| `workflow batch resume` | Return a stopped batch to `active`. Failed tasks stay failed; the run picks up at the next pending task. |
| `workflow batch remove <id…>` | Drop queued tasks. Only `pending` tasks can be removed; the remaining ids do not shift. Their brainstorm notes are left alone. |
| `workflow batch revert <id>` | Mark a `done` task reverted and print `git revert --no-edit <sha>` for it. The CLI never runs git itself — it records state and tells you the command. |
| `workflow batch clear` | Delete the batch, freeing the slot. Refuses while the batch is `active` (stop it first). Deletes the brainstorm notes of tasks that shipped and keeps the rest. |

Task statuses are `pending`, `in-progress`, `done`, `failed`, and `reverted`. A
batch flips itself to `completed` once no task is pending or in progress.
