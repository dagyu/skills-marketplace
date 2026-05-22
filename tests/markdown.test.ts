import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractTitle, listMarkdown } from "../src/lib/markdown.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "wf-md-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("extractTitle", () => {
  test("returns the first level-1 heading", () => {
    expect(extractTitle("# Hello World\n\nbody")).toBe("Hello World");
  });

  test("falls back to undefined when there is no heading", () => {
    expect(extractTitle("just text")).toBeUndefined();
  });
});

describe("listMarkdown", () => {
  test("lists .md files with their titles, ignoring non-markdown", () => {
    writeFileSync(join(dir, "a.md"), "# Alpha\n");
    writeFileSync(join(dir, "b.md"), "no heading here\n");
    writeFileSync(join(dir, "notes.txt"), "ignored");
    const entries = listMarkdown(dir).sort((x, y) => x.file.localeCompare(y.file));
    expect(entries).toEqual([
      { file: "a.md", title: "Alpha" },
      { file: "b.md", title: "b" },
    ]);
  });

  test("returns an empty array for a missing directory", () => {
    expect(listMarkdown(join(dir, "nope"))).toEqual([]);
  });
});
