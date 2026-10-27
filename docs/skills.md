# Skills

The four skills live in `skills/` as `SKILL.md` files with YAML frontmatter (`name` +
a "Use when…" `description`), and are packaged as a Claude Code plugin via
`.claude-plugin/plugin.json`. A `SessionStart` hook (`hooks/session-start`,
registered in `hooks/hooks.json`) injects the overview skill into every session.

## workflow-overview (bootstrap)

Injected at session start. Explains the flow (optional refinement, then implement
directly — or a batch when several notes are queued), lists the `workflow` CLI
commands, sets the prime directive (read `MANIFESTO.md` first), and tells the
agent which skill to invoke when.

## tasks

Captures ideas as tasks and refines them. A task is a `brainstorm` (a raw idea: why it matters and open questions, no implementation detail) or `ready` (a specified design). Capturing an idea is cheap and reads nothing. Refining a task into `ready` reads the manifesto and the internals
map, explores context, asks clarifying questions, proposes approaches, and — only
after the developer agrees — writes the design into the task and promotes it with `workflow task set <name> ready`,
including a **Where it lives** section carrying over the files to touch and the
manifesto rules that constrain the change. **Optional**: when the change is already
clear, the agent skips it and implements directly. After the note is approved, the
agent implements the design directly and deletes the note once it is committed.

That one read is deliberate: because the note carries the context,
**implementation never re-reads `MANIFESTO.md` or `INTERNALS.md`** — single or
batch, the note is the whole spec. It reopens them only if the note proves wrong
about the rules or the layout, and then the note is corrected.

## batch-execution

Runs several tasks as one unattended queue. Reviews each note against
three tests — clear, executable, right-sized — and reports a verdict per note;
anything too big is split by the developer, anything vague is clarified **into the
note**, because the subagent that implements it sees only the note. The agent then
chooses the order (dependencies first, foundations before consumers, smaller and
safer first) and gets one approval for the whole batch, which explicitly covers
each task's commit. Execution is strictly sequential: `batch next` → `batch start`
→ a new subagent → verify → commit → `batch done --commit <sha>`. Every task gets
its own freshly spawned subagent; the main agent only orchestrates, verifies and
commits, and never implements a task itself. Each subagent
updates only the doc pages for the surface it changed and never edits
`INTERNALS.md`; it reports structural changes instead, and the map is updated once
for the whole run at the end. A failure calls
`batch fail`, which stops the batch. Mid-run the developer can stop, resume,
revert a finished task, or remove queued ones — and watch the whole thing in the
browser via `workflow serve`, which the agent suggests but never starts itself. A
finished batch is wrapped up with `batch clear`, which archives it to
`extras/batch/history`.

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
