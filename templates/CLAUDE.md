# CLAUDE.md

Guidance for coding agents working in this repository.

## Workflow

This project is developed with the **workflow** tool: brainstorm → plan →
implement. Move through the phases in order and respect the gates (no planning
before an approved brainstorm; no production code without a failing test first;
no commit before docs are updated and the developer confirms). The
`workflow-overview` skill is injected each session and explains which skill to
use when.

## Read before you work

- **`extras/manifesto/MANIFESTO.md`** — the project's vision and non-negotiable
  guidelines. Every brainstorm, plan, and implementation must respect it. If a
  request conflicts with it, raise that instead of silently violating it.
- **`extras/internals/INTERNALS.md`** — a map of how the code is structured and
  where to make changes. **Read it before navigating or editing the codebase** so
  you reach for the right module the first time, and keep it up to date when the
  structure changes.

## Data is managed by the CLI

Never hand-edit `extras/tasks/data.json`. Manage brainstorm notes and tasks only
through the `workflow` CLI (run `workflow` with no arguments for usage).

## Keep docs honest

When an implementation task changes behaviour, update `docs/`, `README.md`, and —
if the structure changed — `extras/internals/INTERNALS.md`, in the same commit.
