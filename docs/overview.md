# Overview

`workflow` is a two-layer system for raising the quality of agent-driven software
development.

## Layer 1 — the CLI (data)

A Bun/TypeScript CLI manages all workflow state on disk so the agent never
hand-edits JSON. It is **per-project**: every command resolves paths relative to
the current working directory (see `src/lib/paths.ts`), so the same installed
binary works in any project.

The CLI owns:

- **Brainstorm notes** — markdown files in `extras/brainstorm/`.
- **Tasks** — metadata in `extras/tasks/data.json` plus one extended-description
  markdown file per task (`extras/tasks/<slug>.md`).

`src/lib/store.ts` (`TaskStore`) is the *only* module that reads or writes
`data.json`, which keeps the data layer small and unit-testable.

## Layer 2 — the skills (process)

Five skills, packaged as a Claude Code plugin, guide the agent:

- **workflow-overview** — injected at session start; explains the phases and the
  CLI, and points at the manifesto.
- **brainstorming** — rough idea → agreed design note.
- **planning** — design note → concrete tasks (then strips the note).
- **implementation** — task → TDD → developer confirmation → docs → commit.
- **internals** — read `extras/internals/INTERNALS.md` to find the right code
  before editing, and keep that map honest when the structure changes.

The skills enforce hard gates between phases (e.g. no production code without a
failing test, no commit before docs are updated and the developer confirms).

## How the two layers meet

The skills tell the agent *what to do and in what order*; the CLI gives it a safe,
structured place to *record the work*. Two project-owned documents sit above both:
the manifesto (`extras/manifesto/MANIFESTO.md`) is the source of guidelines every
phase must honour, and the internals map (`extras/internals/INTERNALS.md`) — an
extension of `CLAUDE.md` — tells the agent where the code lives so changes land in
the right place.

See [cli.md](cli.md) for the command reference and [skills.md](skills.md) for the
skill details.
