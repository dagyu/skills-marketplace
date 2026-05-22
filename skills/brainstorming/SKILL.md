---
name: brainstorming
description: "Use when the developer has a rough idea, feature request, or problem that is not yet fully specified, before any planning or coding. Refines vague ideas into a clear, agreed design captured in extras/brainstorm/. Triggers: \"I want to add…\", \"what if we…\", \"I'm thinking about…\", unclear scope."
---

# Brainstorming

Turn a rough idea into a clear, agreed design **before** any task is planned or
any code is written. The output is one markdown note per idea in
`extras/brainstorm/`, written only after the developer agrees on the direction.

## When to use

- The developer describes something they want but the scope, approach, or goal
  is not yet pinned down.
- You are tempted to start planning or coding but cannot state the final goal in
  one sentence.

## Anti-pattern: "this is too simple to brainstorm"

Almost every change benefits from a moment of explicit design. If you think it is
too simple, the brainstorm will be short — that is fine. Do not skip it.

## Checklist

1. **Read the manifesto.** Open `extras/manifesto/MANIFESTO.md`. The idea must fit
   its vision and guidelines.
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
   approach, key decisions, and what is out of scope.
7. **Confirm.** Show the note to the developer and get explicit approval.

## Output shape

A brainstorm note should let a future reader (or the planning skill) understand
the idea without you present:

```markdown
# <Title>

## Goal
<one sentence: what success looks like>

## Approach
<the chosen approach and why>

## Key decisions
- ...

## Out of scope
- ...

## Open questions
- ... (only if any remain)
```

## Gate

Do **not** invoke the planning skill until the developer has approved the
brainstorm note.
