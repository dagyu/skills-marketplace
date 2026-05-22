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
  tasksDir: string;
  dataFile: string;
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
  const tasksDir = join(extrasDir, "tasks");
  const manifestoDir = join(extrasDir, "manifesto");
  const internalsDir = join(extrasDir, "internals");
  return {
    root,
    extrasDir,
    brainstormDir: join(extrasDir, "brainstorm"),
    tasksDir,
    dataFile: join(tasksDir, "data.json"),
    manifestoDir,
    manifestoFile: join(manifestoDir, "MANIFESTO.md"),
    internalsDir,
    internalsFile: join(internalsDir, "INTERNALS.md"),
    docsDir: join(root, "docs"),
    readmeFile: join(root, "README.md"),
    claudeFile: join(root, "CLAUDE.md"),
  };
}
