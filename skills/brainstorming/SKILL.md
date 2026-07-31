---
name: brainstorming
description: "Use when the developer has a rough idea, feature request, or problem that is not yet fully specified, before coding. Refines vague ideas into a clear, agreed design captured in extras/brainstorm/. Optional — skip it when the change is already clear. Triggers: \"I want to add…\", \"what if we…\", \"I'm thinking about…\", unclear scope."
---

# Brainstorming

Turn a rough idea into a clear, agreed design **before** any code is written. The
output is one markdown note per idea in `extras/brainstorm/`, written only after
the developer agrees on the direction. The coding agent then implements that
design directly (see workflow-overview).

## When to use

- The developer describes something they want but the scope, approach, or goal
  is not yet pinned down.
- You are tempted to start coding but cannot state the final goal in one sentence.

Brainstorming is **optional**. When the idea is already clear and well understood,
or the developer says to just do it, skip this skill and implement directly.

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
6. **Capture the note.** Run `workflow brainstorm new "<title>"`, then write the
   agreed design into the created file: the goal (one sentence), the chosen
   approach, key decisions, what is out of scope, and **where it lives** — the
   files or modules to touch (from the internals map) plus any manifesto rule that
   constrains the change.
7. **Confirm.** Show the note to the developer and get explicit approval.

## Output shape

A brainstorm note should let a future reader (or whoever implements it) understand
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

## After the brainstorm

Once the developer has approved the note, implement the design directly (see
**How to implement** in workflow-overview): build and verify the change, confirm
with the developer, update docs, and commit. When the note's design is fully
implemented and committed, delete it with `workflow brainstorm delete`.

**Do not re-read `MANIFESTO.md` or `INTERNALS.md` when implementing a note.** They
were read here, and their bearing on this change is already in the note; opening
them again only burns context. Consult them again only when implementation reveals
the note is wrong about where the change lives — and then fix the note.

If several notes are waiting and the developer wants them all built in one run,
use the **batch-execution** skill instead of implementing them one by one. Notes
headed for a batch must be self-contained: the subagent that implements one sees
only the note, so anything agreed in conversation belongs *in the note*.
