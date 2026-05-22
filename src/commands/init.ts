import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { out } from "../lib/cli.ts";
import { resolveProjectPaths } from "../lib/paths.ts";

// Embed the templates with `type: "file"`: Bun bundles them into the compiled
// binary and resolves to the on-disk path when running from source. Each import
// is the path to the (possibly embedded) file.
import manifestoTemplate from "../../templates/MANIFESTO.md" with { type: "file" };
import internalsTemplate from "../../templates/INTERNALS.md" with { type: "file" };
import claudeTemplate from "../../templates/CLAUDE.md" with { type: "file" };
import readmeTemplate from "../../templates/README.md" with { type: "file" };
import docsReadmeTemplate from "../../templates/docs/README.md" with { type: "file" };

/** Make a directory, reporting whether it was created or already present. */
function ensureDir(target: string): void {
  if (existsSync(target)) {
    out(`  skip   ${target}/ (already exists)`);
  } else {
    mkdirSync(target, { recursive: true });
    out(`  create ${target}/`);
  }
}

/** Write a file only if absent. */
function writeIfAbsent(target: string, contents: string): void {
  if (existsSync(target)) {
    out(`  skip   ${target} (already exists)`);
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
  out(`  create ${target}`);
}

/** Copy a (possibly embedded) template file to the target if absent. */
async function copyTemplate(source: string, target: string): Promise<void> {
  if (existsSync(target)) {
    out(`  skip   ${target} (already exists)`);
    return;
  }
  const contents = await Bun.file(source).text();
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
  out(`  create ${target}`);
}

/**
 * Scaffold the workflow folder structure into the current project. Idempotent:
 * existing files are never overwritten.
 */
export async function runInit(): Promise<void> {
  const p = resolveProjectPaths();
  out("Scaffolding workflow structure:");

  ensureDir(p.brainstormDir);
  ensureDir(p.tasksDir);
  ensureDir(p.internalsDir);
  ensureDir(p.docsDir);

  writeIfAbsent(p.dataFile, JSON.stringify({ nextId: 1, tasks: [] }, null, 2) + "\n");

  await copyTemplate(manifestoTemplate, p.manifestoFile);
  await copyTemplate(internalsTemplate, p.internalsFile);
  await copyTemplate(claudeTemplate, p.claudeFile);
  await copyTemplate(readmeTemplate, p.readmeFile);
  await copyTemplate(docsReadmeTemplate, join(p.docsDir, "README.md"));

  out("\nDone. Start with the brainstorming skill, then planning, then implementation.");
}
