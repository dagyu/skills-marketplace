import { join } from "node:path";

/**
 * All workflow-managed paths for a project, resolved relative to a root
 * directory (defaults to the current working directory). This is what makes
 * the CLI per-project: run it anywhere and it operates on that project's
 * extras/ and docs/.
 */
export interface ProjectPaths {
  root: string;
  extrasDir: string;
  brainstormDir: string;
  batchDir: string;
  batchFile: string;
  manifestoDir: string;
  manifestoFile: string;
  internalsDir: string;
  internalsFile: string;
  docsDir: string;
  readmeFile: string;
  claudeFile: string;
}

export function resolveProjectPaths(root: string = process.cwd()): ProjectPaths {
  const extrasDir = join(root, "extras");
  const manifestoDir = join(extrasDir, "manifesto");
  const internalsDir = join(extrasDir, "internals");
  const batchDir = join(extrasDir, "batch");
  return {
    root,
    extrasDir,
    brainstormDir: join(extrasDir, "brainstorm"),
    batchDir,
    batchFile: join(batchDir, "batch.json"),
    manifestoDir,
    manifestoFile: join(manifestoDir, "MANIFESTO.md"),
    internalsDir,
    internalsFile: join(internalsDir, "INTERNALS.md"),
    docsDir: join(root, "docs"),
    readmeFile: join(root, "README.md"),
    claudeFile: join(root, "CLAUDE.md"),
  };
}
