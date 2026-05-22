import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

/** Extract the first level-1 (`# `) heading from markdown text. */
export function extractTitle(markdown: string): string | undefined {
  for (const line of markdown.split("\n")) {
    const match = /^#\s+(.+?)\s*$/.exec(line);
    if (match) return match[1];
  }
  return undefined;
}

export interface MarkdownEntry {
  /** File name relative to the listed directory. */
  file: string;
  /** First heading, or the filename without extension as a fallback. */
  title: string;
}

/** List markdown files in a directory with their titles. Missing dir → []. */
export function listMarkdown(dir: string): MarkdownEntry[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const title =
        extractTitle(readFileSync(join(dir, file), "utf8")) ??
        basename(file, ".md");
      return { file, title };
    });
}
