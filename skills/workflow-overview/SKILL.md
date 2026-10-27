---
name: workflow-overview
description: "Use at the start of any feature, change, or project managed with the workflow CLI, and whenever deciding what to do next. Explains tasks (ideas vs ready tasks), how the coding agent implements directly, and how to run several tasks as one batch. Read before starting any code."
---

# Workflow Overview

This project uses a lightweight workflow: **tasks** that move from a raw idea (`brainstorm`) to a specified one (`ready`),
then the coding agent **implements directly**. Refining is optional — when the
direction is already clear, just build it.

```
task: brainstorm ──► ready (optional)  ──►  implement  ──►  commit
      (raw idea)    (agreed design)         (build it)     (docs + commit)
```

- **Idea is rough or its scope/approach is unclear?** Capture it as a task and refine
  it to `ready` (use the **tasks** skill), then implement.
- **Idea is already clear, or the developer says to just do it?** Skip tasks and
  implement directly.

Refining is a tool, not a gate: reach for it when a moment of explicit design
will help, and skip it when the change is small and well understood.

**Several tasks to build at once?** Run them as a batch (use the
**batch-execution** skill) — only `ready` tasks can be queued: they are reviewed and ordered, the developer
approves once, and each task is then implemented by its own, freshly spawned
subagent, one after another — the main agent only orchestrates, verifies, and
commits; it never implements a batch task itself. At most one batch runs at a
time.

## Prime directive

**Read `extras/manifesto/MANIFESTO.md` before doing any work.** It holds the
project's vision and non-negotiable guidelines. Every change must respect it. If a
request conflicts with the manifesto, raise it with the developer instead of
silently violating it.

**Before navigating or editing the codebase, read
`extras/internals/INTERNALS.md`** — the code map (an extension of `CLAUDE.md`)
that says where each kind of change lives. Use the **internals** skill to consult
it and to keep it honest when the structure changes.

**The one exception — implementing a task.** Both files were read while
the note was written, and what they imply for that change is captured in the note.
Building a note (alone or as part of a batch) reads the note, not the docs. Open
them again only if the note turns out to be wrong about the rules or the layout —
and then correct the note. This keeps each implementation's context small.

If either file is still a stub marked **"Not yet written"** (fresh from `init`),
populate it first: run `workflow manifesto info` / `workflow internals info` for
instructions, then write the manifesto by interviewing the developer and the
internals map from the codebase. Never invent a project's vision or guidelines.

## The `workflow` CLI

Tasks are managed through the `workflow` CLI. Key commands:

| Command | Use |
|---|---|
| `workflow init` | Scaffold `extras/` and `docs/` into a new project (MANIFESTO/INTERNALS as stubs). |
| `workflow manifesto info` | Print how to populate `MANIFESTO.md`; run it, then write the file by interviewing the developer. |
| `workflow internals info` | Print how to populate `INTERNALS.md`; run it, then write the file from the codebase. |
| `workflow task new "<title>"` | Create a task as a `brainstorm` (a raw idea). |
| `workflow task list [--status …]` | List tasks with their status. |
| `workflow task set <name> <brainstorm\|ready>` | Set the status. `ready` is refused until the design sections are filled in. |
| `workflow task delete "<name>"` | Delete a task once its design has been implemented. |
| `workflow batch create "<name>" …` | Queue several ready tasks as one sequential batch, in execution order. |
| `workflow batch status` / `next` | See the batch, or the task to run next. |
| `workflow batch start/done/fail <id>` | Move a task through the run. |
| `workflow batch stop` / `resume` / `remove` / `revert` | The developer's controls over a running batch. |
| `workflow batch clear` | Archive a finished batch to the history (deleting the tasks that shipped), freeing the slot. |
| `workflow batch history` | Past runs: each task, how long it took, and its commit. |
| `workflow serve` | Serve a local page to read/edit tasks and watch a batch run. Offer it to the developer; do not run it as a background task of your own. |

Run `workflow` with no arguments for full usage.

The tasks folder is a **queue, not an archive**: once a task's design has
been implemented and committed, delete it. Keeping it clear keeps the next
refinement precise.

## Which skill, when

- **Idea is rough / not fully specified?** → use the **tasks** skill
  (optional — skip it when the change is clear).
- **Several ready tasks to build in one unattended run?** → use the **batch-execution**
  skill.
- **Need to find or change the right code (or the structure shifted)?** → use the
  **internals** skill.

## How to implement

Whether you refined a task first or went straight in, when you build a change:

1. **Know the constraints.** From a task: the task *is* the spec —
   goal, approach, decisions, and where it lives are all in it, so do not re-read
   `MANIFESTO.md` or `INTERNALS.md`. Without a task: read both first.
2. **Build it** — how you build (test-first, tests-after, or otherwise) is up to
   you and the developer. Keep it minimal (YAGNI) and verify it actually works.
3. **Confirm with the developer**, then **update the docs that cover what you
   changed** — the specific `docs/` page, `README.md` only if what it documents
   changed, and `INTERNALS.md` only if the structure moved (that update is the one
   good reason to open the map). In a batch, subagents skip the internals update
   and report the structural change instead; it is recorded once at the end.
4. **Commit** with the conventional-commit skill (`cmd-llm-conventional-commit`),
   on the developer's go-ahead. If the change came from a task that is
   now fully implemented, delete the task (`workflow task delete`).

## Hard gates

- Do not commit until the change works, the developer confirms, and docs/internals
  are updated. In a batch the developer confirms **once**, by approving the batch
  plan; everything else still applies to every task in it.
