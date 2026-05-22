---
name: planning
description: "Use when a brainstorm note is approved and needs breaking into concrete work, before implementation. Distills extras/brainstorm/ notes into bite-sized tasks via the workflow CLI, then strips the consumed content from the source note. Triggers: \"let's plan this\", \"break this down\", \"create the tasks\"."
---

# Planning

Convert an approved brainstorm note into concrete, bite-sized tasks. Each task is
small enough to implement and commit on its own (roughly one TDD cycle). Tasks are
created through the `workflow` CLI; once a brainstorm note's content has been
turned into tasks, that content is **removed from the note** so it is never
processed twice.

## Planning creates tasks — it does not write code

In this phase you **only create and order tasks**. You do not edit production
code, write tests, or implement anything — not even a stub. Implementation is a
separate phase that starts **only when the developer selects a task to build**
(see the implementation skill). If you feel the urge to "just fix it while I'm
here", stop: capture it as a task instead.

## When to use

- A brainstorm note exists and the developer has approved its direction.
- You have a clear goal and need an ordered list of work to reach it.

## Checklist

1. **Read the manifesto** (`extras/manifesto/MANIFESTO.md`). Tasks must comply with
   its guidelines.
2. **Pick the source note.** Use `workflow brainstorm list`, then read the chosen
   `extras/brainstorm/<note>.md`.
3. **Slice into tasks.** Each task should:
   - have a single, clear concern (one TDD cycle, one commit);
   - be ordered so earlier tasks unblock later ones.
4. **Create each task** with the CLI, **in dependency order** (a task can only
   depend on tasks that already exist, so create the prerequisites first):
   ```
   workflow task create --title "<title>" \
     --description "<one-line summary>" \
     --priority low|medium|high \
     --labels <comma,separated> \
     --depends-on <id,id>   # only if this task is blocked by others
     --body-file <path-to-extended-description.md>
   ```
   Prefer `--body-file`: write the extended description (see template below) to a
   temp markdown file and pass it in. The command prints the new task id.

   **Set dependencies to express order.** Use `--depends-on <id,...>` for a task
   that cannot start until other tasks are `done`. **Omit `--depends-on` entirely
   for a task that can be implemented immediately** — a missing `dependsOn` means
   "ready to build now". Keep dependencies minimal and acyclic; only list a task's
   *direct* prerequisites, not transitive ones. You can also set or change them
   later with `workflow task update <id> --depends-on <id,...>` (an empty value
   clears them).
5. **Strip the consumed content from the brainstorm note.** Edit the source
   `extras/brainstorm/<note>.md` to remove the parts now captured as tasks. If the
   whole note is consumed, leave a short pointer (e.g. "Planned into tasks #1–#4")
   or delete the file. The brainstorm folder is a queue, not an archive.
6. **Review.** Run `workflow task list` (it shows each task's dependencies) and
   confirm the tasks together cover the note's goal with no gaps and no leftover
   unplanned content. Check the dependency order: at least one task should be
   ready (no `dependsOn`), and every listed dependency should point at a real,
   earlier task — no cycles.

## Extended-description template (the task's markdown body)

```markdown
# <Task title>

## Goal
<what this task accomplishes, in the context of the larger idea>

## Acceptance criteria
- [ ] <observable, testable condition>
- [ ] ...

## Implementation notes
- Files likely touched: ...
- Approach: ...

## TDD plan
- Test to write first: <describe the failing test>
- Expected behaviour once green: ...
```

## No placeholders

Do not write "TBD", "etc.", or "similar to the task above". Each task must be
self-contained and unambiguous, so the implementation skill can execute it without
re-deriving the design.

## Gate

Do **not** start writing production code here. That is the implementation skill's
job, and only after a failing test exists.
