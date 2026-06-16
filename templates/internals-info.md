# How to populate extras/internals/INTERNALS.md

INTERNALS.md maps how this project's code is structured and where to make
changes — written for the agents and developers who modify the code, not for its
users. A good map means reaching for the right module the first time instead of
grepping.

**Do not guess the structure.** Inspect the codebase, then confirm the
non-obvious parts with the developer. Find out:

- What are the top-level directories, and what does each own?
- For the changes made most often, where is the entry point?
- What invariants keep the code coherent (single sources of truth, layers that
  must stay side-effect free, etc.)?
- The exact commands to run, test, and build.
- Any gotchas that have bitten people (load order, generated files, env vars).

Then write `extras/internals/INTERNALS.md` with these sections:

## Map of the codebase

One line per top-level directory: what it owns and when to touch it.

## Where things live

For the most common changes, name the entry point so the next agent does not
have to grep — e.g. "Add a command: start in `…`, register it in `…`."

## Module boundaries & invariants

The rules that keep the code coherent. Breaking one is how regressions sneak in.

## How to run, test, and build

The exact commands, assuming the reader has just cloned the repo.

## Gotchas

Non-obvious things that have bitten people. Add to this list whenever something
surprises you.

Keep this file honest: when a change alters the structure, update it in the
**same commit**.
