# Skills

The four skills live in `skills/` as `SKILL.md` files with YAML frontmatter (`name` +
a "Use when…" `description`), and are packaged as a Claude Code plugin via
`.claude-plugin/plugin.json`. A `SessionStart` hook (`hooks/session-start`,
registered in `hooks/hooks.json`) injects the overview skill into every session.

## workflow-overview (bootstrap)

Injected at session start. Explains the flow (optional brainstorm, then implement
directly — or a batch when several notes are queued), lists the `workflow` CLI
commands, sets the prime directive (read `MANIFESTO.md` first), and tells the
agent which skill to invoke when.

## brainstorming

Refines a rough idea into an agreed design. Reads the manifesto, explores context,
asks clarifying questions, proposes approaches, and — only after the developer
agrees — captures a note with `workflow brainstorm new`. **Optional**: when the
change is already clear, the agent skips it and implements directly. After the note
is approved, the agent implements the design directly and deletes the note once it
is committed.

## batch-execution

Runs several brainstorm notes as one unattended queue. Reviews each note against
three tests — clear, executable, right-sized — and reports a verdict per note;
anything too big is split by the developer, anything vague is clarified **into the
note**, because the subagent that implements it sees only the note. The agent then
chooses the order (dependencies first, foundations before consumers, smaller and
safer first) and gets one approval for the whole batch, which explicitly covers
each task's commit. Execution is strictly sequential: `batch next` → `batch start`
→ one subagent → verify → commit → `batch done --commit <sha>`. A failure calls
`batch fail`, which stops the batch. Mid-run the developer can stop, resume,
revert a finished task, or remove queued ones; a finished batch is wrapped up with
`batch clear`.

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
