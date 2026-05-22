---
name: workflow-overview
description: "Use at the start of any feature, change, or project managed with the workflow CLI, and whenever deciding what to do next. Explains the brainstorm → plan → implement phases and which skill to invoke. Read before touching extras/tasks/data.json or starting code."
---

# Workflow Overview

This project uses a three-phase workflow that turns rough ideas into committed,
tested, documented code. Each phase has its own skill. Move through them in order;
do not skip ahead.

```
brainstorm  ──►  plan  ──►  implement  ──►  commit
 (capture)     (tasks)      (TDD)         (docs + commit)
```

## Prime directive

**Read `extras/manifesto/MANIFESTO.md` before doing any work.** It holds the
project's vision and non-negotiable guidelines. Every brainstorm, plan, and
implementation must respect it. If a request conflicts with the manifesto, raise
it with the developer instead of silently violating it.

**Before navigating or editing the codebase, read
`extras/internals/INTERNALS.md`** — the code map (an extension of `CLAUDE.md`)
that says where each kind of change lives. Use the **internals** skill to consult
it and to keep it honest when the structure changes.

## The `workflow` CLI is the data layer

All brainstorm notes and tasks are managed through the `workflow` CLI — **never
hand-edit `extras/tasks/data.json`**. Key commands:

| Command | Use |
|---|---|
| `workflow init` | Scaffold `extras/` and `docs/` into a new project. |
| `workflow brainstorm new "<title>"` | Create a brainstorm note. |
| `workflow brainstorm list` | List brainstorm notes. |
| `workflow task create --title ... [--description --priority --labels --body-file]` | Create a task (prints its id). |
| `workflow task list [--status --priority --label --json]` | List/filter tasks. |
| `workflow task get <id> [--json]` | Show a task and its extended description. |
| `workflow task update <id> [--status --title ...]` | Update a task. |
| `workflow task delete <id>` | Delete a task and its markdown file. |

Run `workflow` with no arguments for full usage.

## Which skill, when

- **Idea is rough / not fully specified?** → use the **brainstorming** skill.
- **Idea is agreed but not broken into work?** → use the **planning** skill.
- **Tasks exist and you are ready to build?** → use the **implementation** skill.
- **Need to find or change the right code (or the structure shifted)?** → use the
  **internals** skill.

## Hard gates

- Do not start planning until the developer has approved a brainstorm.
- Do not write production code without a failing test first (see implementation).
- Do not commit until tests pass, the developer confirms, and docs are updated.
