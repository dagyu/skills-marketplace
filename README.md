# workflow

A lightweight **brainstorm (optional) → implement** workflow for coding agents,
inspired by [superpowers](https://github.com/obra/superpowers). It combines two
layers:

1. **A `workflow` CLI** (TypeScript, run with [Bun](https://bun.sh)) — the data
   layer. It manages brainstorm notes on disk, plus the manifesto/internals
   scaffolding.
2. **A set of skills** (a Claude Code plugin) — the process layer. They guide the
   agent to brainstorm when useful, implement directly, and enforce the rules:
   manifesto guidelines, honest docs, developer-confirmed commits.

## The flow

| Step | What happens | Output |
|---|---|---|
| **Brainstorm** (optional) | Refine a rough idea into an agreed design. Skip it when the change is already clear. | A markdown note in `extras/brainstorm/`. |
| **Implement** | The coding agent builds the change directly — from the brainstorm note or straight from the request: code → confirm → docs → commit. | Working code, updated docs, one commit; the note deleted once implemented. |

`extras/manifesto/MANIFESTO.md` holds the project's vision and non-negotiable
guidelines; every change must respect it.

## Project layout produced by `workflow init`

```
<project>/
├── extras/
│   ├── brainstorm/          # one markdown note per idea
│   ├── manifesto/MANIFESTO.md   # vision + guidelines (stub → `workflow manifesto info`)
│   └── internals/INTERNALS.md   # code-structure map (stub → `workflow internals info`)
├── docs/                    # project documentation
├── CLAUDE.md                # agent guidance; points at the manifesto + internals
└── README.md
```

`extras/internals/INTERNALS.md` is an extension of `CLAUDE.md`: it maps how the
code is structured and where to make each kind of change, so coding agents reach
for the right module the first time. The **internals** skill keeps it honest.

`init` writes `MANIFESTO.md` and `INTERNALS.md` as **stubs** — the workflow can't
know your vision or code layout. Each stub points at an `info` command
(`workflow manifesto info`, `workflow internals info`) that explains how to fill
it in: the agent runs it, then writes the manifesto by interviewing you and the
internals map from the codebase, rather than starting from boilerplate.

## Install

```bash
bun install        # (no runtime deps; sets up the workspace)
bun link           # put `workflow` on your PATH
```

Or run without linking: `bun /path/to/workflow/src/index.ts <command>`.

## CLI quick reference

```bash
workflow --version                             # print version + build time
workflow init                                  # scaffold extras/ and docs/
workflow manifesto info                        # how to populate MANIFESTO.md (then write it)
workflow internals info                        # how to populate INTERNALS.md (then write it)
workflow brainstorm new "Add login"            # create a brainstorm note
workflow brainstorm list
workflow brainstorm delete "Add login"         # remove a note once it is implemented
```

See [`docs/`](docs/) for full documentation.

## Compile a standalone binary

```bash
bun run compile            # → dist/workflow
bun run compile ./bin/wf   # custom output path
```

This uses `bun build --compile` and stamps the build time into the binary, so
`workflow --version` reports exactly which build is running:

```
workflow 0.1.0 (built 2026-05-22T14:05:13.699Z)
```

When run from source (`bun run src/index.ts`), the build time reads
`dev (running from source)` instead.

## Develop

```bash
bun test           # run the test suite
```

## License

MIT
