---
name: internals
description: "Use before navigating or editing an unfamiliar part of the codebase, and whenever a change moves, renames, or adds a module. Reads extras/internals/INTERNALS.md to find the right code fast, and keeps that map honest. Triggers: \"where does X live\", \"how is this structured\", \"which file handles…\", before grepping blindly, after changing module boundaries."
---

# Internals

`extras/internals/INTERNALS.md` is the project's **code map** — how the code is
structured and where to make each kind of change. It is an extension of
`CLAUDE.md`, written for developers and agents who modify the code. This skill
keeps you using it: read it before you touch unfamiliar code, and update it the
moment the structure changes.

## When to use

- You are about to navigate or edit a part of the codebase you do not already
  know cold. Read the map first instead of grepping blind.
- An implementation task is about to **move, rename, split, or add** a module,
  command, or responsibility — i.e. it changes the structure the map describes.

## Read before you navigate

1. Open `extras/internals/INTERNALS.md`. Use its **Map of the codebase** and
   **Where things live** sections to jump straight to the entry point for the
   change you intend to make.
2. Honour the **Module boundaries & invariants** — they are the rules that keep
   the code coherent (e.g. "only module X reads file Y"). Breaking one silently
   is how regressions sneak in.
3. If the map is silent, wrong, or contradicts what you find in the code, **trust
   the code** and fix the map (see below) — do not propagate stale guidance.

## Keep the map honest

The map is only useful if it matches reality. Update
`extras/internals/INTERNALS.md` **in the same commit** as the code whenever you:

- add a new module, command, directory, or template;
- move a responsibility from one place to another, or rename a boundary;
- discover a gotcha (load order, generated file, env var, platform quirk) worth
  warning the next person about.

This is the same honesty rule the implementation skill applies to `docs/` and
`README.md` — extend it to the internals map.

## Relationship to the other skills

- This is **not** a phase of its own. It supports the others: consult the map
  during **implementation** to find the right code, and update it as part of that
  task's documentation step.
- It does **not** replace `extras/manifesto/MANIFESTO.md`. The manifesto says
  *what the project must be*; the internals map says *where the code is*.

## Red flags — STOP

- You started grepping or editing unfamiliar code without reading the map.
- You changed the structure but left `INTERNALS.md` describing the old layout.
- The map disagrees with the code and you followed the map anyway.
