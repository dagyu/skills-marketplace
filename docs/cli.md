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

Scaffold the workflow structure into the current project: `extras/tasks/`,
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

## `workflow task`

A **task** is a markdown note in `extras/tasks/` with a `status:` line of frontmatter:
`brainstorm` (a raw idea — no implementation detail, may be refined) or `ready`
(specified; implementable from the note alone, and the only status a batch accepts).
A note with no status reads as `brainstorm`. Batch execution state is not a task
status — the batch owns it.

| Command | Description |
|---|---|
| `workflow task new "<title>"` | Create `extras/tasks/<slug>.md` as a `brainstorm`, seeded with Idea / Why / Open questions sections. Prints the path. |
| `workflow task list [--status <status>]` | List tasks with their status, optionally only one status. |
| `workflow task set <name> <status>` | Set the status (`brainstorm` or `ready`). Moving to `ready` fails unless the **Goal**, **Approach**, **Where it lives** and **Out of scope** sections are present and non-empty; moving back to `brainstorm` is always allowed. |
| `workflow task delete "<name>"` | Delete `extras/tasks/<slug>.md` (accepts the task's title or slug). Errors non-zero if no such task exists. Use it to clear a task once its design has been implemented. |

## `workflow batch`

A **batch** runs several tasks back to back, one task at a time. Its
state lives in `extras/batch/`, written only by `src/lib/batch-store.ts`. The
notes themselves are the task specs — a batch references them, it does not copy
them.

**At most one batch exists at a time.** `create` refuses while another is on disk,
so a new batch is only possible after the current one is stopped or completed and
then cleared. This is what stops a second run being queued on top of a live one.

| Command | Description |
|---|---|
| `workflow batch create "<name>" …` | Queue the named **ready** tasks (title or slug). Refuses a task that is still a `brainstorm`. **Argument order is execution order.** Validates that each note exists and that none is listed twice; assigns each task a stable id. |
| `workflow batch status [--json]` | Print the batch, its status (`active`, `stopped`, `completed`) and every task. `--json` emits the raw record. |
| `workflow batch next [--json]` | Print the next task to execute — the first pending one, and only while the batch is active. |
| `workflow batch start <id>` | Mark a task in progress. Refuses unless it is the next pending task and nothing else is running: this is what keeps a batch sequential. |
| `workflow batch done <id> [--commit <sha>]` | Close the in-progress task as implemented, recording the commit that shipped it. |
| `workflow batch fail <id> --reason <why>` | Close it as failed and stop the batch. `--reason` is required. |
| `workflow batch stop [--reason <why>]` | Halt execution. An in-progress task returns to `pending` (with a note) so a resumed batch re-runs it from a known state. |
| `workflow batch resume` | Return a stopped batch to `active`. Failed tasks stay failed; the run picks up at the next pending task. |
| `workflow batch add "<name>" … [--before <id>]` | Queue more notes as pending tasks, at the end or just before a pending task. New tasks get fresh ids (existing ids never shift); refuses a note already in the batch, or a completed batch. |
| `workflow batch remove <id…>` | Drop queued tasks. Only `pending` tasks can be removed; the remaining ids do not shift. Their tasks are left alone. |
| `workflow batch revert <id>` | Mark a `done` task reverted and print `git revert --no-edit <sha>` for it. The CLI never runs git itself — it records state and tells you the command. |
| `workflow batch clear` | Archive the batch to the history and delete the live file, freeing the slot. Refuses while the batch is `active` (stop it first). Deletes the tasks of tasks that shipped and keeps the rest. |
| `workflow batch history [--json]` | Show past runs: each task, how long it took, and the commit it produced. |

Task statuses are `pending`, `in-progress`, `done`, `failed`, and `reverted`. A
batch flips itself to `completed` once no task is pending or in progress.

### On-disk format

Both files are line-oriented and tab-separated, not JSON. They live in git and are
rewritten on every task transition, so the format is chosen to keep diffs small: a
status change is a one-line diff, and there are no braces, quotes, or repeated key
names to pay for. `src/lib/batch-format.ts` is the only module that knows it.

```
b	a	1753948128
t	1	d	cache-user-profiles	Cache user profiles	1753948130	64	deadbee
t	2	p	add-login-flow	Add login flow
```

- A **`b`** record opens a batch: status, then the creation time in epoch seconds
  (which doubles as the run's id).
- Each **`t`** record is one task, in execution order: id, status, slug, title,
  start time, **seconds taken**, commit, note.
- Statuses are single letters — `a`/`s`/`c` for a batch (active, stopped,
  completed) and `p`/`r`/`d`/`f`/`v` for a task (pending, running, done, failed,
  reverted).
- A task records **how long it took** rather than a second timestamp, absent
  trailing fields are dropped (a queued task costs five short fields), and tabs,
  newlines and backslashes in free text are backslash-escaped.

| File | Holds |
|---|---|
| `extras/batch/batch` | The live batch — one block. Deleted by `batch clear`. |
| `extras/batch/history` | Every finished run, appended one block at a time. Append-only, so git stores each run as a few added lines. |

The title is stored rather than re-read from the note, because `batch clear`
deletes the notes that shipped and the history has to stay readable afterwards.
Everything else — a task's spec path — is derived from its slug.

## `workflow serve`

Start a local web preview of the project's tasks and its batch run.

```bash
workflow serve                          # http://127.0.0.1:4242
workflow serve --port 8080 --host 0.0.0.0
```

The page has three tabs (keys `1`–`3`; the tab is kept in the URL hash) and refreshes
itself every two seconds. Each pane scrolls on its own, so a long task never pushes
the batch out of view:

- **Tasks** — a searchable list (press `/`), filterable by `brainstorm` / `ready`,
  next to a reader for the selected task in `extras/tasks/`, rendered as markdown.
  Click one to read it, **Edit** to change it; saving writes straight to the file
  on disk. A note whose task a subagent is implementing right now is **locked** —
  the server rejects the write with `409` rather than change a spec out from under
  a running task. Stop the batch to edit it.
- **Batch** — progress bar, shipped count and elapsed time, then every task in order
  with its status, the running task's clock ticking, and durations and commits as
  they land. Click a task to open it.
- **History** — past runs from `extras/batch/history`, each collapsible.

It is a developer tool: it writes to the project's files and has no
authentication, so it binds to loopback unless you pass `--host`. It never mutates
a batch — stopping, reverting, and removing stay in the CLI, where the agent and
the developer already coordinate.

Routes, if you want to script against it: `GET /api/state` (notes, live batch,
history), `GET /api/note/<slug>`, `PUT /api/note/<slug>` with the markdown as the
body. These speak JSON over the wire — that is unrelated to how batches are
*stored*.
