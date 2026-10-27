# workflow

A lightweight **task → implement** workflow for coding agents,
inspired by [superpowers](https://github.com/obra/superpowers). It combines two
layers:

1. **A `workflow` CLI** (TypeScript, run with [Bun](https://bun.sh)) — the data
   layer. It manages tasks and batch runs on disk, plus the
   manifesto/internals scaffolding.
2. **A set of skills** (a Claude Code plugin) — the process layer. They guide the
   agent to capture and refine tasks when useful, implement directly, run a batch of
   ready tasks unattended, and enforce the rules: manifesto guidelines, honest
   docs, developer-confirmed commits.

## The flow

| Step | What happens | Output |
|---|---|---|
| **Task** (optional) | Capture a raw idea (`brainstorm`), then refine it into an agreed design (`ready`). Skip it when the change is already clear. | A markdown note in `extras/tasks/` with a status. |
| **Implement** | The coding agent builds the change directly — from the task or straight from the request: code → confirm → docs → commit. | Working code, updated docs, one commit; the note deleted once implemented. |
| **Batch** (optional) | Several ready tasks at once: the agent reviews each one, clarifies it, orders them, and — on a single approval — implements them one after another with a subagent per task. | One commit per task, run sequentially; the batch state in `extras/batch/`. |

`extras/manifesto/MANIFESTO.md` holds the project's vision and non-negotiable
guidelines; every change must respect it.

## Project layout produced by `workflow init`

```
<project>/
├── extras/
│   ├── tasks/               # one markdown note per task; status: brainstorm | ready
│   ├── batch/batch          # the current batch run, if any    ┐ both written on
│   ├── batch/history        # finished runs: tasks, times, shas ┘ demand by `batch`
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
workflow task new "Add login"            # create a task
workflow task list
workflow task delete "Add login"         # remove a note once it is implemented

workflow batch create "Add login" "Cache API"  # queue notes as one run, in execution order
workflow batch status                          # where the run is
workflow batch next                            # the task to execute now
workflow batch stop | resume | remove <id> | revert <id>
workflow batch clear                           # finish up: archive the run, delete shipped notes
workflow batch history                         # past runs: tasks, durations, commits

workflow serve                                 # browse/edit notes and watch the run at :4242
```

Only one batch exists at a time: while it is live the developer can stop it,
revert a finished task, or drop queued ones — but a new batch has to wait until
this one is cleared.

## Watching a run

`workflow serve` opens a local page listing every task — click to read
it as rendered markdown, **Edit** to change it, and the save writes the file
itself. The same page shows the live batch (task statuses, the running task's
elapsed time, commits as they land) and the history of past runs, refreshing
itself as the batch moves. The note a subagent is currently implementing is
locked against edits.

## Batch state on disk

`extras/batch/` is committed with the project, so it is stored line by line rather
than as JSON — one record per line, tab-separated, single-letter statuses, epoch
seconds, and durations instead of a second timestamp:

```
b	a	1753948128
t	1	d	cache-user-profiles	Cache user profiles	1753948130	64	deadbee
t	2	p	add-login-flow	Add login flow
```

A task moving from pending to done is a one-line diff, and `extras/batch/history`
is append-only, so a finished run costs git a handful of added lines. See
[`docs/cli.md`](docs/cli.md#on-disk-format) for the full grammar.

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
