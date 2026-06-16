# CLI reference

All commands operate on the current working directory's `extras/` and `docs/`.

## `workflow --version` (`-v`)

Print the version and the build time, e.g.
`workflow 0.1.0 (built 2026-05-22T14:05:13.699Z)`. The version comes from
`package.json` (single source of truth). The build time is injected at compile
time via `bun build --compile --define __BUILD_TIME__=…` (see
[Compiling](#compiling)); running from source reports
`dev (running from source)`.

## Compiling

`bun run compile [outfile]` (default `dist/workflow`) builds a standalone
executable with `bun build --compile`. `scripts/compile.ts` stamps the current
ISO timestamp into the binary. Templates used by `workflow init` are embedded into
the binary via `with { type: "file" }` imports, so the compiled binary is fully
self-contained.

## `workflow init`

Scaffold the workflow structure into the current project: `extras/brainstorm/`,
`extras/manifesto/MANIFESTO.md`, `extras/internals/INTERNALS.md` (the
code-structure map), `docs/`, a starter `README.md`, and a `CLAUDE.md` that points
the agent at the manifesto and the internals map. Idempotent — existing files are
never overwritten.

`MANIFESTO.md` and `INTERNALS.md` are scaffolded as **stubs**, not filled-in
documents: the workflow has no way to know the project's vision or code layout.
Each stub points the agent at the matching `info` command, which it should run
and then act on before any real work — populating the manifesto by interviewing
the developer, and the internals map from the codebase.

## `workflow manifesto` / `workflow internals`

| Command | Description |
|---|---|
| `workflow manifesto info` | Print instructions for writing `extras/manifesto/MANIFESTO.md` — the sections to include and the questions to ask the developer. The agent runs this, then writes the file; it does not invent the vision or guidelines. |
| `workflow internals info` | Print instructions for writing `extras/internals/INTERNALS.md` — the sections to include and what to inspect/confirm. The agent runs this, then writes the file from the actual codebase. |

## `workflow brainstorm`

| Command | Description |
|---|---|
| `workflow brainstorm new "<title>"` | Create `extras/brainstorm/<slug>.md` seeded with the title heading. Prints the path. |
| `workflow brainstorm list` | List notes with their titles. |
| `workflow brainstorm delete "<name>"` | Delete `extras/brainstorm/<slug>.md` (accepts the note's title or slug). Errors non-zero if no such note exists. Use it to clear a note once its design has been implemented. |
