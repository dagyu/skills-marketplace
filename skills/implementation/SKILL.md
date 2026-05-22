---
name: implementation
description: "Use when picking up a planned task to build it, following strict TDD. Drives the failing-test → code → confirm → docs → commit cycle and updates task status via the workflow CLI. Triggers: \"implement task N\", \"let's build this\", \"start coding\", a task moving to in-progress."
---

# Implementation

Build one planned task at a time using **test-driven development**, get the
developer's confirmation, update the docs, and commit. The task is only done when
all five steps below are complete.

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
selected task ─► check deps ─► RED (failing test) ─► GREEN (code) ─► confirm ─► docs ─► commit ─► done
```

1. **Open the selected task.** `workflow task get <id>` to read its goal,
   acceptance criteria, and TDD plan. Re-read `extras/manifesto/MANIFESTO.md` — the
   code must respect its guidelines.

   **Check its dependencies first.** If the task has a `dependsOn` list, every
   listed task must be `done` before you start (`workflow task get <dep>` to
   confirm). If any prerequisite is not done, **stop** and tell the developer which
   task must be completed first — do not build on an unfinished prerequisite. A
   task with no `dependsOn` is ready to build now.

   Then mark it started: `workflow task update <id> --status in-progress`.

2. **Write the test (RED).** Write a test for the next acceptance criterion. Run it
   and **watch it fail for the right reason** (the behaviour is missing, not a typo
   or import error). If it passes, the test is wrong — fix it.

3. **Write the code (GREEN).** Write the minimum code to make the test pass. No
   speculative extras (YAGNI). Run the test and watch it pass. Repeat steps 2–3 for
   each acceptance criterion.

4. **Get the developer's confirmation.** Show that the tests pass and summarise the
   change. **Wait for the developer to confirm** the implementation is accepted
   before continuing. This is a gate.

5. **Update documentation.** If the change affects behaviour, update `docs/`,
   `README.md`, and — if a guideline or core idea changed — `extras/manifesto/`.
   Keep them honest and in the same change as the code.

6. **Commit.** Use the conventional-commit skill (`cmd-llm-conventional-commit`) to
   create a single commit covering the code, tests, and doc updates. Then mark the
   task done: `workflow task update <id> --status done`.

## Red flags — STOP and restart the cycle

- You started building a task the developer did not select.
- You started a task whose `dependsOn` prerequisites are not all `done`.
- You wrote production code and there is no test that failed first.
- You never actually ran the test and saw it fail.
- You are about to commit before the developer confirmed.
- The code adds capabilities no test or acceptance criterion asked for.
- Docs/README no longer match what the code does.

## One task, one commit

Implement and commit tasks individually. If a task turns out to be too big, stop
and return to the planning skill to split it.
