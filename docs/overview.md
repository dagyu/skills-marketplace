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
- **Batches** — `extras/batch/batch.json`: an ordered queue of notes to implement
  back to back, plus the rules that keep the run sequential and single (see
  [cli.md](cli.md#workflow-batch)).
- **Scaffolding** — the manifesto and internals stubs, `docs/`, `CLAUDE.md`, and a
  starter `README.md`, all written by `workflow init`.

## Layer 2 — the skills (process)

Four skills, packaged as a Claude Code plugin, guide the agent:

- **workflow-overview** — injected at session start; explains the flow (optional
  brainstorm, then implement directly), lists the CLI, and points at the manifesto.
- **brainstorming** — rough idea → agreed design note (optional; skip when the
  change is already clear).
- **batch-execution** — several notes → one reviewed, ordered, unattended run.
- **internals** — read `extras/internals/INTERNALS.md` to find the right code
  before editing, and keep that map honest when the structure changes.

There is no task tracker and no separate planning phase: once the direction is
clear, the coding agent implements directly. The skills still enforce the rules —
respect the manifesto, keep docs honest, and do not commit before the change works
and the developer confirms. A batch is the one place that last rule is folded
forward: the developer confirms the whole batch once, when approving its plan.

## How the two layers meet

The skills tell the agent *what to do and in what order*; the CLI gives it a safe,
structured place to *record the work*. Two project-owned documents sit above both:
the manifesto (`extras/manifesto/MANIFESTO.md`) is the source of guidelines every
phase must honour, and the internals map (`extras/internals/INTERNALS.md`) — an
extension of `CLAUDE.md` — tells the agent where the code lives so changes land in
the right place.

See [cli.md](cli.md) for the command reference and [skills.md](skills.md) for the
skill details.
