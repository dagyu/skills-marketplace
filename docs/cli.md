# CLI reference

All commands operate on the current working directory's `extras/` and `docs/`.

## `workflow init`

Scaffold the workflow structure into the current project: `extras/brainstorm/`,
`extras/tasks/` (with an empty `data.json`), `extras/manifesto/MANIFESTO.md`,
`docs/`, and a starter `README.md`. Idempotent — existing files are never
overwritten.

## `workflow brainstorm`

| Command | Description |
|---|---|
| `workflow brainstorm new "<title>"` | Create `extras/brainstorm/<slug>.md` seeded with the title heading. Prints the path. |
| `workflow brainstorm list` | List notes with their titles. |

## `workflow task`

| Command | Description |
|---|---|
| `workflow task create --title "<t>" [--description <d>] [--priority low\|medium\|high] [--labels a,b] [--body-file <path>]` | Create a task. Assigns the next integer id, writes `extras/tasks/<id>-<slug>.md` (from `--body-file` if given, else a stub), and prints the id. |
| `workflow task list [--status <s>] [--priority <p>] [--label <l>] [--json]` | List/filter tasks. `--json` prints the raw array. |
| `workflow task get <id> [--json]` | Show a task's metadata and its extended-description body. `--json` includes the body as a field. |
| `workflow task update <id> [--title --description --priority --labels --status]` | Patch fields and bump `updatedAt`. |
| `workflow task delete <id>` | Remove the task from `data.json` and delete its markdown file. |

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
| `createdAt` / `updatedAt` | ISO string | |

Invalid enum values and missing required flags exit non-zero with an error on
stderr.
