import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { BatchStore } from "../lib/batch-store.ts";
import { CliError, out } from "../lib/cli.ts";
import { extractTitle, listMarkdown } from "../lib/markdown.ts";
import { resolveProjectPaths, type ProjectPaths } from "../lib/paths.ts";
import { slugify } from "../lib/slug.ts";

// Embedded like the init templates, so the compiled binary serves the UI without
// needing the source tree on disk.
import appHtml from "../web/app.html" with { type: "file" };

const DEFAULT_PORT = 4242;

/**
 * A local, read-and-edit preview of the project's brainstorm notes and the live
 * batch run. Bound to the loopback interface by default: it writes to the
 * project's files and has no authentication, so it is a developer tool, not
 * something to expose.
 */
export async function runServe(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { port: { type: "string" }, host: { type: "string" } },
    allowPositionals: false,
  });

  const port = Number(values.port ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new CliError(`Invalid --port "${values.port}". Expected 1–65535.`);
  }
  const hostname = values.host ?? "127.0.0.1";
  const paths = resolveProjectPaths();

  const server = Bun.serve({
    port,
    hostname,
    fetch: (req) => handle(req, paths),
    error: (err) => new Response(err.message, { status: 500 }),
  });

  out(`workflow preview → http://${server.hostname}:${server.port}`);
  out(`  project: ${paths.root}`);
  out("  brainstorm notes are editable; the batch view refreshes itself");
  out("Press Ctrl-C to stop.");

  // Bun.serve does not block, and index.ts exits as soon as main resolves.
  await new Promise(() => {});
}

function handle(req: Request, paths: ProjectPaths): Response | Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/" && req.method === "GET") {
    return new Response(Bun.file(appHtml), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (url.pathname === "/api/state" && req.method === "GET") {
    return json(state(paths));
  }

  const note = url.pathname.match(/^\/api\/note\/(.+)$/);
  if (note) {
    const slug = slugify(decodeURIComponent(note[1]!));
    if (req.method === "GET") return getNote(paths, slug);
    if (req.method === "PUT") return putNote(paths, slug, req);
  }

  return new Response("Not found", { status: 404 });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function store(paths: ProjectPaths): BatchStore {
  return new BatchStore(paths.batchFile, paths.historyFile);
}

/** Everything the page polls for: the notes, the live batch, and past runs. */
function state(paths: ProjectPaths) {
  const st = store(paths);
  return {
    root: basename(paths.root),
    now: Math.floor(Date.now() / 1000),
    brainstorms: listMarkdown(paths.brainstormDir).map((e) => ({
      slug: basename(e.file, ".md"),
      title: e.title,
    })),
    batch: st.read() ?? null,
    history: st.history(),
  };
}

/** The note a task is being implemented from right now, if any. */
function lockedSlug(paths: ProjectPaths): string | undefined {
  return store(paths).current()?.slug;
}

function noteFile(paths: ProjectPaths, slug: string): string | undefined {
  const file = join(paths.brainstormDir, `${slug}.md`);
  return existsSync(file) ? file : undefined;
}

function getNote(paths: ProjectPaths, slug: string): Response {
  const file = noteFile(paths, slug);
  if (!file) return new Response("No such brainstorm note", { status: 404 });
  const content = readFileSync(file, "utf8");
  return json({
    slug,
    title: extractTitle(content) ?? slug,
    content,
    locked: lockedSlug(paths) === slug,
  });
}

async function putNote(paths: ProjectPaths, slug: string, req: Request): Promise<Response> {
  const file = noteFile(paths, slug);
  if (!file) return new Response("No such brainstorm note", { status: 404 });
  // Editing the spec out from under a running subagent would silently change the
  // task it is halfway through implementing.
  if (lockedSlug(paths) === slug) {
    return new Response(
      "This note is being implemented right now. Stop the batch before editing it.",
      { status: 409 },
    );
  }
  writeFileSync(file, await req.text(), "utf8");
  return json({ ok: true });
}
