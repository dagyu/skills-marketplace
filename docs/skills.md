# Skills

The skills live in `skills/` as `SKILL.md` files with YAML frontmatter (`name` +
a "Use when…" `description`), and are packaged as a Claude Code plugin via
`.claude-plugin/plugin.json`. A `SessionStart` hook (`hooks/session-start`,
registered in `hooks/hooks.json`) injects the overview skill into every session.

## workflow-overview (bootstrap)

Injected at session start. Explains the three phases, lists the `workflow` CLI
commands, sets the prime directive (read `MANIFESTO.md` first; never hand-edit
`data.json`), and tells the agent which skill to invoke for each phase.

## brainstorming

Refines a rough idea into an agreed design. Reads the manifesto, explores context,
asks clarifying questions, proposes approaches, and — only after the developer
agrees — captures a note with `workflow brainstorm new`. Gate: no planning until
the note is approved.

## planning

Distills an approved brainstorm note into concrete, bite-sized tasks created with
`workflow task create` (preferring `--body-file` for the extended description). It
**only creates and orders tasks — it never writes code**. Tasks are created in
dependency order, using `--depends-on` to mark a task blocked by earlier ones and
omitting it when a task is ready to build. After creating the tasks it **removes
the converted content from the source note** — deleting the note outright with
`workflow brainstorm delete` when it is fully consumed, or editing it to leave
only the not-yet-planned parts — so nothing is processed twice. Gate: no
production code here.

## implementation

Builds one task at a time under strict TDD, **starting only when the developer
selects a task** (and after confirming each `dependsOn` prerequisite is `done` or
already deleted). The cycle: read the task and manifesto → failing test (RED) →
minimal code (GREEN) → **developer confirmation** → update
`docs/`/`README.md`/manifesto → commit (via `cmd-llm-conventional-commit`) →
**delete the finished task** (`workflow task delete`). Completed tasks are not
kept; git history is the record. The Iron Law: no production code without a
failing test first.

## internals

Not a phase of its own — it supports the others. Tells the agent to read
`extras/internals/INTERNALS.md` (the code map, an extension of `CLAUDE.md`) before
navigating or editing unfamiliar code, to honour the module boundaries it records,
and to update the map in the same commit whenever a change moves, renames, or adds
a module. Consulted during implementation; the scaffolded `CLAUDE.md` points here.

## Authoring conventions

- `name`: lowercase, hyphenated.
- `description`: third-person, starts with "Use when…", describes *triggering
  conditions* (so the agent can find the skill), not just what it does.
- Keep skills concise; prefer checklists and explicit gates over prose.
