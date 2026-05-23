---
name: implementation
description: "Use when picking up a planned task to build it, following strict TDD. Drives the failing-test → code → confirm → docs → commit cycle and updates task status via the workflow CLI. Triggers: \"implement task N\", \"let's build this\", \"start coding\", a task moving to in-progress."
---

# Implementation

Build one planned task at a time using **test-driven development**, get the
developer's confirmation, update the docs and/or internals, and commit. The task
is only done when all the steps below are complete.

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

## The Iron Law

**No production code without a failing test that came first.** If you wrote code
before a test, delete it and start the cycle properly. Watching the test fail is
how you know it tests the right thing.

## When to use

- **The developer has selected a task to build.** Implementation starts on a
  developer's say-so for a specific task — do not pick one yourself or start
  building straight out of planning. If no task has been chosen, run
  `workflow task list` and ask the developer which to take.

## The cycle

```
check lock ─► check deps ─► acquire ─► RED (test) ─► GREEN (code) ─► confirm ─► docs/internals ─► commit ─► delete task
```

1. **Open the selected task and acquire the lock.** First run `workflow task
   current` (see "One task at a time" above) — if a *different* task is in progress,
   stop. Then `workflow task get <id>` to read its goal, acceptance criteria, and
   TDD plan, and re-read `extras/manifesto/MANIFESTO.md` — the code must respect its
   guidelines.

   **Check its dependencies.** A task with no `dependsOn` is ready now. For each id
   in `dependsOn`, the prerequisite is satisfied if it is `done` **or no longer
   exists** — finished tasks are deleted (step 6), so a `dependsOn` id that
   `workflow task get` cannot find means that work was completed and cleaned up. If
   any prerequisite still exists and is **not** `done`, **stop** and tell the
   developer which task must be completed first — do not build on an unfinished
   prerequisite.

   Then take the lock: `workflow task update <id> --status in-progress` (this
   fails if another task is already in progress).

2. **Write the test (RED).** Write a test for the next acceptance criterion. Run it
   and **watch it fail for the right reason** (the behaviour is missing, not a typo
   or import error). If it passes, the test is wrong — fix it.

3. **Write the code (GREEN).** Write the minimum code to make the test pass. No
   speculative extras (YAGNI). Run the test and watch it pass. Repeat steps 2–3 for
   each acceptance criterion.

4. **Prompt for confirmation.** When the task's behaviour is complete, show that
   the tests pass and summarise the change. **Wait for the developer to confirm**
   the implementation is accepted before touching any metadata files. This is a
   gate — do not proceed to docs/internals or commit without it.

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
- You began a second task while another is still `in-progress` (check
  `workflow task current` first — only one task at a time).
- You started a task while one of its `dependsOn` prerequisites still exists and
  is not `done`.
- You updated `docs/` or `internals` (or committed) before the developer confirmed.
- You committed a finished task but left it in the tracker instead of deleting it.
- You wrote production code and there is no test that failed first.
- You never actually ran the test and saw it fail.
- You are about to commit before the developer confirmed.
- The code adds capabilities no test or acceptance criterion asked for.
- Docs/README no longer match what the code does.

## One task, one commit

Implement and commit tasks individually. If a task turns out to be too big, stop
and return to the planning skill to split it.
