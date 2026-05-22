import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { out } from "../lib/cli.ts";
import { resolveProjectPaths } from "../lib/paths.ts";

const TEMPLATES_DIR = join(import.meta.dir, "..", "..", "templates");

/** Write a file only if it does not already exist. Reports which path it took. */
function writeIfAbsent(target: string, contents: string): void {
  if (existsSync(target)) {
    out(`  skip   ${target} (already exists)`);
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
  out(`  create ${target}`);
}

function ensureDir(target: string): void {
  if (existsSync(target)) {
    out(`  skip   ${target}/ (already exists)`);
  } else {
    mkdirSync(target, { recursive: true });
    out(`  create ${target}/`);
  }
}

/**
 * Scaffold the workflow folder structure into the current project. Idempotent:
 * existing files are never overwritten.
 */
export function runInit(): void {
  const p = resolveProjectPaths();
  out("Scaffolding workflow structure:");

  ensureDir(p.brainstormDir);
  ensureDir(p.tasksDir);
  ensureDir(p.docsDir);

  writeIfAbsent(p.dataFile, JSON.stringify({ nextId: 1, tasks: [] }, null, 2) + "\n");

  // Manifesto, README and docs are copied from the bundled templates.
  copyTemplate("MANIFESTO.md", p.manifestoFile);
  copyTemplate("README.md", p.readmeFile);
  copyTemplate(join("docs", "README.md"), join(p.docsDir, "README.md"));

  out("\nDone. Start with the brainstorming skill, then planning, then implementation.");
}

function copyTemplate(relativeTemplate: string, target: string): void {
  if (existsSync(target)) {
    out(`  skip   ${target} (already exists)`);
    return;
  }
  const source = join(TEMPLATES_DIR, relativeTemplate);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);
  out(`  create ${target}`);
}
