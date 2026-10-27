---
name: tasks
description: "Use when the developer has a rough idea, feature request, or problem — to capture it as a task, and later to refine it until it is ready to implement. A task has a status: `brainstorm` (a raw idea, no implementation detail) or `ready` (specified, batchable). Triggers: \"I want to add…\", \"what if we…\", \"I'm thinking about…\", \"note this idea\", unclear scope, \"let's refine X\"."
---

# Tasks

A task is one markdown note in `extras/tasks/`, managed with `workflow task …`. It
carries a status, and the status decides what the note may contain and what may be
done with it:

| Status | Meaning | May contain | May be |
|---|---|---|---|
| `brainstorm` | A raw idea that could be refined. | The idea, why it matters, open questions. **No implementation detail** — no files, no approach. | Captured, discussed, refined. **Never implemented or batched.** |
| `ready` | Agreed and specified; implementable from the note alone. | The full design (see *Output shape*). | Implemented directly or queued in a batch. |

Batch execution state (queued, running, done…) is not a task status — the batch
tracks that. A task only says whether it is eligible to run.

## Phase 1 — capture an idea (cheap)

When the developer floats an idea and is not ready to design it:

1. `workflow task new "<title>"` — creates the note as a `brainstorm`.
2. Fill the **Idea**, **Why** and **Open questions** sections in a few lines.
   Stop there. Do not read the manifesto or internals, explore code, or propose
   an approach — that is phase 2. Do not drift into implementation detail.

`workflow task list --status brainstorm` shows what is waiting to be refined.

## Phase 2 — refine into a ready task

Turn a `brainstorm` (or a fresh idea) into a design agreed before any code is
written. Optional for small, clear changes — when the change is already clear, or
the developer says to just do it, skip tasks entirely and implement directly.

## Checklist

1. **Read the manifesto and the internals map.** Open
   `extras/manifesto/MANIFESTO.md` — the idea must fit its vision and guidelines —
   and `extras/internals/INTERNALS.md` to find where the change belongs. **This is
   the only time either file is read for this idea**: whoever implements the note
   works from the note alone, so whatever they need from these two files must end
   up written into it.
2. **Explore context.** Look at the existing code and docs relevant to the idea so
   your proposals build on what exists rather than reinventing it.
3. **Ask clarifying questions.** Resolve the unknowns: what problem does this
   solve, who is it for, what is explicitly out of scope, what does "done" mean?
4. **Propose 1–3 approaches.** For each, give the trade-offs. Recommend one.
   Apply YAGNI ruthlessly — cut anything not needed now.
5. **Agree on a direction with the developer.** This is a gate. Do not write the
   note until they have chosen.
6. **Write the task.** Use the existing note (or `workflow task new "<title>"`
   for a fresh idea) and replace its idea skeleton with the agreed design: the goal (one sentence), the chosen
   approach, key decisions, what is out of scope, and **where it lives** — the
   files or modules to touch (from the internals map) plus any manifesto rule that
   constrains the change.
7. **Confirm and promote.** Show the note to the developer and get explicit approval,
   then run `workflow task set <name> ready`. It refuses unless the Goal, Approach,
   Where it lives and Out of scope sections are filled in.

## Output shape

A ready task should let a future reader (or whoever implements it) understand
the idea without you present:

```markdown
# <Title>

## Goal
<one sentence: what success looks like>

## Approach
<the chosen approach and why>

## Key decisions
- ...

## Where it lives
- <file/module to touch and why — carried over from the internals map>
- <any manifesto rule that constrains this change>

## Out of scope
- ...

## Open questions
- ... (only if any remain)
```

## After the task is ready

Once the developer has approved the note, implement the design directly (see
**How to implement** in workflow-overview): build and verify the change, confirm
with the developer, update docs, and commit. When the note's design is fully
implemented and committed, delete it with `workflow task delete`.

**Do not re-read `MANIFESTO.md` or `INTERNALS.md` when implementing a note.** They
were read here, and their bearing on this change is already in the note; opening
them again only burns context. Consult them again only when implementation reveals
the note is wrong about where the change lives — and then fix the note.

If several notes are waiting and the developer wants them all built in one run,
use the **batch-execution** skill instead of implementing them one by one. Notes
headed for a batch must be self-contained: the subagent that implements one sees
only the note, so anything agreed in conversation belongs *in the note*.
