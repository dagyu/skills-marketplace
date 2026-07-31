---
name: batch-execution
description: "Use when the developer wants several brainstorm notes built in one unattended run rather than one at a time. Reviews each note (clear, executable, right-sized), clarifies what is vague, orders the work, and executes it sequentially with one subagent per task. Triggers: \"run all my brainstorms\", \"batch these ideas\", \"execute these one after another\", \"build everything in extras/brainstorm\"."
---

# Batch Execution

Turn a set of approved brainstorm notes into a queue of tasks and build them back
to back, one subagent at a time. The developer approves once, up front; the batch
then runs without stopping for each change.

```
select ─► review (gate) ─► clarify ─► order ─► approve (gate) ─► execute ─► clear
```

## When to use

- The developer has several brainstorm notes and wants them all implemented.
- Use it from two notes upward. For a single note, skip this skill and implement
  directly (see workflow-overview) — the review overhead is not worth it.

## The one-batch rule

**At most one batch exists at a time.** Run `workflow batch status` before
anything else. While a batch is on disk the developer may only:

- **stop** it (`workflow batch stop`),
- **revert** a finished task (`workflow batch revert <id>`),
- **remove** queued tasks (`workflow batch remove <id…>`).

A new batch is possible only once the current one is stopped or completed **and**
cleared with `workflow batch clear`. Never work around this by hand-editing
`extras/batch/`.

## 1. Select

Run `workflow brainstorm list` and have the developer pick the notes. Read the
manifesto (`extras/manifesto/MANIFESTO.md`) and the internals map
(`extras/internals/INTERNALS.md`) before judging any of them. Echo the exact list
back before reviewing it.

## 2. Review — a gate

Read every selected note in full and give it a verdict on all three tests:

| Test | Passes when |
|---|---|
| **Clear** | The goal is one sentence, the approach is decided, there are no open questions, and "done" is something you can check. |
| **Executable** | It fits the manifesto, the codebase actually supports it, and nothing it needs is missing. A dependency on another note *in this batch* is an ordering constraint, not a blocker; a dependency on something unbuilt and unqueued blocks it. |
| **Right-sized** | One focused change, landing as one commit in one sitting. |

Signs a note is **too big**: its goal sentence needs an "and"; it touches
unrelated subsystems; it has several independent deliverables; it would sprawl
across layers before anything is verifiable.

Report the verdicts as a table — *ready* / *needs clarification* / *too big* /
*blocked* — and say what each non-ready note is missing. Only *ready* notes enter
the batch.

## 3. Split what is too big — the developer's call

Propose a split into notes that each pass the review, with a one-line goal for
each, and let the developer decide. They may split differently, defer a piece, or
insist on batching it as-is — that is their call; if they do insist, say plainly
why the size is risky and proceed. Once a split is agreed:

1. `workflow brainstorm new "<title>"` for each piece, writing its design in.
2. `workflow brainstorm delete "<original>"` to retire the oversized note.

## 4. Clarify

Ask **all** outstanding questions in one pass, not one at a time — a batch is
approved once, so unknowns must be resolved before it starts.

Write every answer back **into the note**. The note is the entire spec the
subagent receives: it will not see this conversation, the manifesto discussion, or
anything you inferred. A note that only makes sense with you present is not ready.
Delete the "Open questions" section once it is empty.

## 5. Order — you choose it

Order the ready notes yourself:

1. **Hard dependencies first** — anything another note builds on.
2. **Shared foundations before their consumers** — schemas, types, helpers.
3. **Otherwise smaller and lower-risk first**, so that if something fails late,
   most of the batch has already shipped.

Present the order with a one-line reason per task and ask for approval of the
whole batch.

**Say this explicitly when you ask: approving the plan is the go-ahead for every
task in the batch, including each task's commit.** That is the one place a batch
departs from the normal per-change confirmation, so it must be stated, not
assumed.

## 6. Create

`workflow batch create "<slug>" "<slug>" …` — arguments in execution order. It
refuses if a batch already exists.

## 7. Execute

Loop until `workflow batch next` reports nothing to run:

1. `workflow batch next` — gives the task id and its spec path.
2. `workflow batch start <id>`.
3. **Spawn one subagent** for that task, and only that task. Its prompt must
   stand alone: read the spec at `<path>`, read `extras/manifesto/MANIFESTO.md`
   and `extras/internals/INTERNALS.md`, implement the design, verify it works,
   update `docs/`, `README.md`, and `INTERNALS.md` where behaviour or structure
   changed, **do not commit**, and report what changed, whether verification
   passed, and anything it could not resolve.
4. **Verify the result yourself** — run the tests or build. A subagent's report
   is a claim, not evidence.
5. **Commit** with the conventional-commit skill (`cmd-llm-conventional-commit`).
6. `git rev-parse --short HEAD`, then
   `workflow batch done <id> --commit <sha>`.
7. Leave the working tree clean before taking the next task.

If a task cannot be completed — verification fails, the design turns out wrong,
or a decision surfaces that the developer must make —
`workflow batch fail <id> --reason "<what happened>"`. That stops the batch. Report
it and wait. Never skip ahead to the next task.

## 8. Finish

When `workflow batch status` reads *completed*, summarise what shipped (task,
commit, how long it took — one line each), then run `workflow batch clear`. That
appends the run to `extras/batch/history` — the permanent record of which tasks
ran, how long each took, and what each committed — deletes the brainstorm notes of
the tasks that shipped, and keeps the notes of anything removed, failed, or
reverted so they can be queued again later.

`workflow batch history` reads past runs back. Use it when the developer asks what
a previous batch did, rather than digging through the git log.

## Watching the run

The developer can follow the batch in a browser with `workflow serve` — it lists
the notes (readable and editable) and shows the run live. Suggest it when you
create the batch. Two things follow from it:

- **Do not start it yourself** as a background process. It runs until stopped;
  it's the developer's to launch and close.
- A note can change under you between tasks. Always read a task's spec at the
  moment you start it — never rely on what you read during the review.

## Handling the controls mid-run

- **Stop** — `workflow batch stop --reason "<why>"`. Any in-progress task returns
  to pending, so a resumed batch re-runs it from a known state; make sure the
  working tree is clean or the change is committed first. `workflow batch resume`
  continues.
- **Revert** — `workflow batch revert <id>` prints the `git revert` command for
  that task's commit. Run it only after the developer confirms, then commit the
  revert. Warn them if later tasks built on the one being reverted.
- **Remove** — `workflow batch remove <id…>` drops queued tasks. Their brainstorm
  notes stay in `extras/brainstorm/` for a future batch.

## Red flags — STOP

- Two subagents running at once, or starting a task before the previous one is
  committed.
- A note entering the batch with open questions, or one you privately think is
  too big.
- A subagent prompt that relies on context only you have — put it in the note.
- Continuing past a failed task instead of stopping and reporting.
- Creating a second batch, or hand-editing `extras/batch/`.
- Marking a task done on the subagent's word, without running anything yourself.
