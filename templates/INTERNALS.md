# Internals

> A map of **how this project's code is structured** and where to make changes —
> written for developers and coding agents who modify the code, not for users of
> it. Think of it as an extension of `CLAUDE.md`: read it before navigating the
> codebase so you reach for the right module the first time.
>
> Keep this file honest. When an implementation task changes the structure
> (new module, moved responsibility, renamed boundary), update the relevant
> section here in the **same commit** — exactly as you would the docs.

## Map of the codebase

_List the top-level directories and what each owns. Keep it to one line each._

<!--
| Path | Owns | Touch it when… |
|---|---|---|
| `src/lib/` | Pure, unit-tested helpers | Adding reusable logic with no I/O |
| `src/commands/` | One file per CLI command | Adding or changing a command |
| `tests/` | The test suite (TDD) | Always — write the failing test first |
-->

## Where things live

_For the changes you make most often, name the entry point so the next person
(or agent) does not have to grep for it._

<!--
- **Add a new command / route / endpoint:** start in `…`, register it in `…`.
- **Change how data is stored:** `…` is the *only* module that reads/writes `…`.
- **Add configuration:** `…`.
- **Add a template / static asset:** `…`.
-->

## Module boundaries & invariants

_The rules that keep the code coherent. Breaking one is how regressions sneak in._

<!--
1. Only `…` may read or write `…` (single source of truth).
2. `src/lib/` must stay free of side effects so it is unit-testable.
3. User-facing output goes through `…`, never raw `console.log`.
-->

## How to run, test, and build

_The exact commands. Assume the reader has just cloned the repo._

<!--
- Run:   `…`
- Test:  `…`
- Build: `…`
-->

## Gotchas

_Non-obvious things that have bitten people: load order, generated files, env
vars, platform quirks. Add to this list whenever something surprises you._

<!-- - … -->
