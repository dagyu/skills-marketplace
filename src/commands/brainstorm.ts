import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CliError, out } from "../lib/cli.ts";
import { listMarkdown } from "../lib/markdown.ts";
import { resolveProjectPaths } from "../lib/paths.ts";
import { slugify } from "../lib/slug.ts";

const USAGE = `Usage:
  workflow brainstorm new <title>      Create a brainstorm note
  workflow brainstorm list             List brainstorm notes
  workflow brainstorm delete <name>    Delete a note (by title or slug)`;

export function runBrainstorm(args: string[]): void {
  const [sub, ...rest] = args;
  switch (sub) {
    case "new":
      return brainstormNew(rest);
    case "list":
      return brainstormList();
    case "delete":
      return brainstormDelete(rest);
    default:
      throw new CliError(`Unknown brainstorm command "${sub ?? ""}".\n${USAGE}`);
  }
}

function brainstormNew(rest: string[]): void {
  const title = rest.join(" ").trim();
  if (!title) throw new CliError("A title is required: workflow brainstorm new <title>");

  const p = resolveProjectPaths();
  mkdirSync(p.brainstormDir, { recursive: true });
  const file = join(p.brainstormDir, `${slugify(title)}.md`);
  if (existsSync(file)) {
    throw new CliError(`Brainstorm note already exists: ${file}`);
  }
  writeFileSync(file, `# ${title}\n\n`, "utf8");
  out(file);
}

function brainstormDelete(rest: string[]): void {
  const name = rest.join(" ").trim();
  if (!name) throw new CliError("A note name is required: workflow brainstorm delete <name>");

  const p = resolveProjectPaths();
  const slug = slugify(name);
  const file = join(p.brainstormDir, `${slug}.md`);
  if (!existsSync(file)) {
    throw new CliError(`No brainstorm note "${slug}" (looked for extras/brainstorm/${slug}.md).`);
  }
  rmSync(file);
  out(`Deleted extras/brainstorm/${slug}.md`);
}

function brainstormList(): void {
  const p = resolveProjectPaths();
  const entries = listMarkdown(p.brainstormDir);
  if (entries.length === 0) {
    out("No brainstorm notes yet.");
    return;
  }
  for (const e of entries) {
    out(`${e.title}\n  extras/brainstorm/${e.file}`);
  }
}
