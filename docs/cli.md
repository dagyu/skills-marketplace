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
`extras/tasks/` (with an empty `data.json`), `extras/manifesto/MANIFESTO.md`,
`extras/internals/INTERNALS.md` (the code-structure map), `docs/`, a starter
`README.md`, and a `CLAUDE.md` that points the agent at the manifesto and the
internals map. Idempotent — existing files are never overwritten.

## `workflow brainstorm`

| Command | Description |
|---|---|
| `workflow brainstorm new "<title>"` | Create `extras/brainstorm/<slug>.md` seeded with the title heading. Prints the path. |
| `workflow brainstorm list` | List notes with their titles. |

## `workflow task`

| Command | Description |
|---|---|
| `workflow task create --title "<t>" [--description <d>] [--priority low\|medium\|high] [--labels a,b] [--depends-on 1,2] [--body-file <path>]` | Create a task. Assigns the next integer id, writes `extras/tasks/<id>-<slug>.md` (from `--body-file` if given, else a stub), and prints the id. |
| `workflow task list [--status <s>] [--priority <p>] [--label <l>] [--json]` | List/filter tasks. The text view shows each task's dependencies; `--json` prints the raw array. |
| `workflow task get <id> [--json]` | Show a task's metadata and its extended-description body. `--json` includes the body as a field. |
| `workflow task update <id> [--title --description --priority --labels --depends-on --status]` | Patch fields and bump `updatedAt`. |
| `workflow task delete <id>` | Remove the task from `data.json` and delete its markdown file. |

`--depends-on` takes a comma-separated list of task ids the task is blocked by
(e.g. `--depends-on 1,3`). Each id must be a positive integer that refers to an
existing task and not the task itself, or the command exits non-zero. Omit the
flag to leave a task independently implementable; on `update`, pass an empty
value (`--depends-on ""`) to clear an existing dependency list.

### Task fields (`data.json`)

`data.json` has the shape `{ "nextId": number, "tasks": Task[] }`. Each task:

| Field | Type | Notes |
|---|---|---|
| `id` | number | Auto-increment; never reused. |
| `title` | string | |
| `description` | string | One-line summary. |
| `priority` | `low` \| `medium` \| `high` | Defaults to `medium`. |
| `labels` | string[] | |
| `path` | string | Project-relative path to the markdown body. |
| `status` | `todo` \| `in-progress` \| `done` | Defaults to `todo`. |
| `dependsOn` | number[] | Ids of tasks that must be `done` first. **Absent when the task is ready to build now**; populated only when blocked. |
| `createdAt` / `updatedAt` | ISO string | |

Invalid enum values and missing required flags exit non-zero with an error on
stderr.
