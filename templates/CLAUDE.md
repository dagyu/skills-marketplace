# CLAUDE.md

Guidance for coding agents working in this repository.

## Workflow

This project is developed with the **workflow** tool: an optional refinement to
agree on a design, then the coding agent implements directly (no task tracker, no
separate planning phase). Refine a rough idea into a ready task first; otherwise build it.
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

**Exception — implementing a task.** Both files were read when the note
was written and their bearing on the change is recorded in it. Build the note from
the note alone; re-read these files only if it proves wrong about the rules or the
layout, and then fix the note.

If either file is still a stub marked **"Not yet written"**, populate it before
real work: run `workflow manifesto info` / `workflow internals info` for
instructions, then write the manifesto by interviewing the developer and the
internals map from the codebase — do not invent them.

## Tasks and batches are managed by the CLI

Manage tasks through the `workflow` CLI (run `workflow` with no
arguments for usage), rather than hand-creating files in `extras/tasks/`.

When several notes should be built in one unattended run, use the
**batch-execution** skill and `workflow batch` — never hand-edit
`extras/batch/`. One batch runs at a time: until it is cleared, the
developer can stop it, revert a finished task, or drop queued ones, but not start
another.

## Keep docs honest

When a change alters behaviour, update the docs that cover it — the `docs/` page
for that surface, `README.md` if what it documents changed, and
`extras/internals/INTERNALS.md` if the structure moved — in the same commit. Touch
only the pages the change actually affects. In a batch, subagents leave
`INTERNALS.md` alone and report structural changes; the map is updated once at the
end of the run.
