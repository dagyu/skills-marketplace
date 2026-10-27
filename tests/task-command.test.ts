import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { missingSections, readStatus, withStatus } from "../src/lib/task-file.ts";

const CLI = join(import.meta.dir, "..", "src", "index.ts");
let project: string;

async function wf(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", CLI, ...args], { cwd: project, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { code: await proc.exited, stdout, stderr };
}

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "wf-task-"));
});
afterEach(() => rmSync(project, { recursive: true, force: true }));

describe("task status file format", () => {
  test("a missing status reads as brainstorm", () => {
    expect(readStatus("# T\n")).toBe("brainstorm");
  });
  test("withStatus adds then replaces the status without touching the body", () => {
    const ready = withStatus("# T\n\nbody\n", "ready");
    expect(readStatus(ready)).toBe("ready");
    const back = withStatus(ready, "brainstorm");
    expect(readStatus(back)).toBe("brainstorm");
    expect(back.endsWith("# T\n\nbody\n")).toBe(true);
    expect(back.match(/status:/g)).toHaveLength(1);
  });
  test("missingSections flags absent and empty sections", () => {
    expect(missingSections("# T\n## Goal\nx\n## Approach\n\n## Out of scope\nx\n")).toEqual([
      "Approach",
      "Where it lives",
    ]);
  });
});

describe("workflow task", () => {
  test("new creates a brainstorm", async () => {
    const res = await wf("task", "new", "Add login");
    expect(res.code).toBe(0);
    expect(readStatus(readFileSync(res.stdout.trim(), "utf8"))).toBe("brainstorm");
    expect((await wf("task", "list", "--status", "brainstorm")).stdout).toContain("Add login");
    expect((await wf("task", "list", "--status", "ready")).stdout).toContain("No ready tasks");
  });

  test("set ready refuses an unspecified task, accepts a specified one, and can demote", async () => {
    const file = (await wf("task", "new", "Add login")).stdout.trim();
    const refused = await wf("task", "set", "add-login", "ready");
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain("Not ready");

    writeFileSync(
      file,
      readFileSync(file, "utf8") +
        "\n## Goal\nx\n## Approach\nx\n## Where it lives\nx\n## Out of scope\nx\n",
    );
    expect((await wf("task", "set", "add-login", "ready")).code).toBe(0);
    expect(readStatus(readFileSync(file, "utf8"))).toBe("ready");
    expect((await wf("task", "set", "add-login", "brainstorm")).code).toBe(0);
    expect(readStatus(readFileSync(file, "utf8"))).toBe("brainstorm");
  });

  test("rejects an unknown status", async () => {
    await wf("task", "new", "Add login");
    expect((await wf("task", "set", "add-login", "done")).stderr).toContain("Unknown status");
  });
});
