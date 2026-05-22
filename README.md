# workflow

A structured **brainstorm → plan → implement** workflow for coding agents,
inspired by [superpowers](https://github.com/obra/superpowers). It combines two
layers:

1. **A `workflow` CLI** (TypeScript, run with [Bun](https://bun.sh)) — the data
   layer. It manages brainstorm notes and tasks on disk so the agent never
   hand-edits `extras/tasks/data.json`.
2. **A set of skills** (a Claude Code plugin) — the process layer. They guide the
   agent through three phases and enforce the rules: TDD, manifesto guidelines, and
   honest docs.

## The three phases

| Phase | What happens | Output |
|---|---|---|
| **Brainstorm** | Refine a rough idea into an agreed design. | A markdown note in `extras/brainstorm/`. |
| **Plan** | Distill the note into concrete, bite-sized tasks; strip the consumed content from the note. | Tasks in `extras/tasks/` (`data.json` + one markdown body per task). |
| **Implement** | TDD a task: failing test → code → confirm → docs → commit. | Tested code, updated docs, one commit. |

`extras/manifesto/MANIFESTO.md` holds the project's vision and non-negotiable
guidelines; every phase must respect it.

## Project layout produced by `workflow init`

```
<project>/
├── extras/
│   ├── brainstorm/          # one markdown note per idea
│   ├── tasks/
│   │   ├── data.json        # task metadata (source of truth)
│   │   └── <id>-<slug>.md   # extended description per task
│   ├── manifesto/MANIFESTO.md   # vision + non-negotiable guidelines
│   └── internals/INTERNALS.md   # code-structure map for developers/agents
├── docs/                    # project documentation
├── CLAUDE.md                # agent guidance; points at the manifesto + internals
└── README.md
```

`extras/internals/INTERNALS.md` is an extension of `CLAUDE.md`: it maps how the
code is structured and where to make each kind of change, so coding agents reach
for the right module the first time. The **internals** skill keeps it honest.

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
workflow brainstorm new "Add login"            # create a brainstorm note
workflow brainstorm list
workflow task create --title "Login form" --priority high --labels ui,auth
workflow task list [--status --priority --label --json]
workflow task get <id> [--json]
workflow task update <id> --status done
workflow task delete <id>
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
bun test           # run the test suite (TDD throughout)
```

## License

MIT
