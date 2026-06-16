# CLAUDE.md

Guidance for coding agents working in this repository.

## Workflow

This project is developed with the **workflow** tool: an optional brainstorm to
agree on a design, then the coding agent implements directly (no task tracker, no
separate planning phase). Brainstorm when the idea is rough; otherwise build it.
Do not commit before docs are updated and the developer confirms. The
`workflow-overview` skill is injected each session and explains which skill to
use when.

## Read before you work

- **`extras/manifesto/MANIFESTO.md`** — the project's vision and non-negotiable
  guidelines. Every change must respect it. If a request conflicts with it, raise
  that instead of silently violating it.
- **`extras/internals/INTERNALS.md`** — a map of how the code is structured and
  where to make changes. **Read it before navigating or editing the codebase** so
  you reach for the right module the first time, and keep it up to date when the
  structure changes.

If either file is still a stub marked **"Not yet written"**, populate it before
real work: run `workflow manifesto info` / `workflow internals info` for
instructions, then write the manifesto by interviewing the developer and the
internals map from the codebase — do not invent them.

## Brainstorm notes are managed by the CLI

Manage brainstorm notes through the `workflow` CLI (run `workflow` with no
arguments for usage), rather than hand-creating files in `extras/brainstorm/`.

## Keep docs honest

When a change alters behaviour, update `docs/`, `README.md`, and — if the
structure changed — `extras/internals/INTERNALS.md`, in the same commit.
