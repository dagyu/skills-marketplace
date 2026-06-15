---
name: implementation
description: "Use when picking up a planned task to build it. Drives the build → confirm → docs → commit cycle and updates task status via the workflow CLI. Triggers: \"implement task N\", \"let's build this\", \"start coding\", a task moving to in-progress."
---

# Implementation

Build one planned task at a time, get the developer's confirmation, update the
docs and/or internals, and commit. The task is only done when all the steps below
are complete.

**How you build is up to you and the developer.** This skill does not mandate a
methodology — test-first (TDD), tests-after, or any other approach are all fine.
Whatever you choose, make sure the task actually works before calling it done.

## One task at a time (the lock)

A task in the `in-progress` state is a **lock**: only one task may hold it, so
only one task is ever being implemented. The `workflow` CLI enforces this —
`workflow task update <id> --status in-progress` fails while another task is
already in progress. Before starting, **always check the lock with
`workflow task current`**:

- "No task in progress." → you may start the selected task.
- "In progress: #N …" and **N is the task you were asked to build** → continue it.
- "In progress: #N …" and **N is a different task** → **stop**. You cannot start a
  new one until #N is finished (committed and deleted) or the developer releases it
  (`workflow task update N --status todo`).

## When to use

- **The developer has selected a task to build.** Implementation starts on a
  developer's say-so for a specific task — do not pick one yourself or start
  building straight out of planning. If no task has been chosen, run
  `workflow task list` and ask the developer which to take.

## The cycle

```
check lock ─► check deps ─► ASK to proceed ─► acquire ─► build ─► confirm ─► docs/internals ─► commit ─► delete task
```

1. **Open the selected task and check it can start.** First run `workflow task
   current` (see "One task at a time" above) — if a *different* task is in progress,
   stop. Then `workflow task get <id>` to read its goal, acceptance criteria, and
   implementation notes, and re-read `extras/manifesto/MANIFESTO.md` — the code must
   respect its guidelines.

   **Check its dependencies.** A task with no `dependsOn` is ready now. For each id
   in `dependsOn`, the prerequisite is satisfied if it is `done` **or no longer
   exists** — finished tasks are deleted (step 6), so a `dependsOn` id that
   `workflow task get` cannot find means that work was completed and cleaned up. If
   any prerequisite still exists and is **not** `done`, **stop** and tell the
   developer which task must be completed first — do not build on an unfinished
   prerequisite.

2. **Explicitly ask the developer to proceed.** This is a gate, separate from the
   lock check. Even once the task is selected, unlocked, and unblocked, **ask
   plainly — e.g. "Proceed with implementing #N — <title>?" — and wait for an
   explicit yes.** Do not acquire the lock or write anything until they confirm.
   Only then take the lock: `workflow task update <id> --status in-progress` (this
   fails if another task is already in progress).

3. **Build it.** Implement the task to satisfy its acceptance criteria, one
   criterion at a time. Use whatever development approach you and the developer
   prefer — write the test first (TDD), write tests after, or otherwise. Keep it
   minimal: no speculative extras (YAGNI). Before moving on, **verify it actually
   works** — run the relevant tests/checks and confirm each acceptance criterion is
   met.

4. **Prompt for confirmation.** When the task's behaviour is complete, show that it
   works (e.g. passing tests) and summarise the change. **Wait for the developer to
   confirm** the implementation is accepted before touching any metadata files. This
   is a gate — do not proceed to docs/internals or commit without it.

5. **Update the right metadata files (docs and/or internals).** Once confirmed,
   decide *what the change affected* and update accordingly, in the same change as
   the code:
   - **`docs/` and `README.md`** — when the change affects **external usage**: what
     the project does, how to run/use it, its behaviour or interface.
   - **`extras/internals/INTERNALS.md`** — when the change affects the **code
     structure**: a new/moved/renamed module, a changed boundary or invariant, a
     new place where a kind of change lives (it is the map agents navigate by).
   - **Both** when the change touches both (a new feature that also shifts how the
     code is organised), and **`extras/manifesto/`** if a guideline or core idea
     changed.

   If the change has no obvious home — you cannot tell whether it belongs in docs
   or internals, or find an existing section it maps to — **ask the developer what
   to update** rather than guessing or skipping. Keep every file honest. If nothing
   genuinely needs updating, say so explicitly.

6. **Ask to commit, then commit and delete the task.** After the metadata files are
   updated, **ask the developer for confirmation to commit.** On their go-ahead, use
   the conventional-commit skill (`cmd-llm-conventional-commit`) for a single commit
   covering the code, tests, and doc/internals updates. Once committed the work
   lives in git history, so **remove the task**: `workflow task delete <id>` (this
   also releases the lock). Completed tasks are not kept — the task list should only
   ever hold outstanding work. The clearer the task list and codebase, the more
   precise the next decision is.

## Red flags — STOP and restart the cycle

- You started building a task the developer did not select.
- You acquired the lock or started building without **explicitly asking the
  developer to proceed** and getting a yes.
- You began a second task while another is still `in-progress` (check
  `workflow task current` first — only one task at a time).
- You started a task while one of its `dependsOn` prerequisites still exists and
  is not `done`.
- You updated `docs/` or `internals` (or committed) before the developer confirmed.
- You committed a finished task but left it in the tracker instead of deleting it.
- You called the task done without verifying it actually works.
- You are about to commit before the developer confirmed.
- The code adds capabilities no test or acceptance criterion asked for.
- Docs/README no longer match what the code does.

## One task, one commit

Implement and commit tasks individually. If a task turns out to be too big, stop
and return to the planning skill to split it.
