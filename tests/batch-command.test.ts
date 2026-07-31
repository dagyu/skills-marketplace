import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "..", "src", "index.ts");
let project: string;

/** Run the CLI inside the temp project; return stdout/stderr/exit code. */
async function wf(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", CLI, ...args], {
    cwd: project,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, stdout, stderr };
}

/** Create brainstorm notes so they can be queued. */
async function notes(...titles: string[]): Promise<void> {
  for (const title of titles) await wf("brainstorm", "new", title);
}

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "wf-batch-cli-"));
});

afterEach(() => {
  rmSync(project, { recursive: true, force: true });
});

describe("workflow batch create", () => {
  test("queues notes in the given order, taking titles from the notes", async () => {
    await notes("Add login", "Rate limit the API");
    const created = await wf("batch", "create", "rate-limit-the-api", "Add login");
    expect(created.code).toBe(0);
    expect(created.stdout).toContain("#1  pending     Rate limit the API");
    expect(created.stdout).toContain("#2  pending     Add login");
  });

  test("rejects a note that does not exist", async () => {
    const res = await wf("batch", "create", "nope");
    expect(res.code).toBe(1);
    expect(res.stderr).toContain("No brainstorm note");
  });

  test("rejects the same note twice", async () => {
    await notes("Add login");
    const res = await wf("batch", "create", "add-login", "add-login");
    expect(res.code).toBe(1);
    expect(res.stderr).toContain("listed twice");
  });

  test("a batch is a lock: no second batch until the first is cleared", async () => {
    await notes("Add login", "Rate limit the API");
    await wf("batch", "create", "add-login");
    const second = await wf("batch", "create", "rate-limit-the-api");
    expect(second.code).toBe(1);
    expect(second.stderr).toContain("batch clear");
  });
});

describe("workflow batch status / next", () => {
  test("reports no batch before one is created", async () => {
    expect((await wf("batch", "status")).stdout).toContain("No batch");
    expect((await wf("batch", "next")).stdout).toContain("No batch");
  });

  test("--json emits the batch for the agent to parse", async () => {
    await notes("Add login");
    await wf("batch", "create", "add-login");
    const parsed = JSON.parse((await wf("batch", "status", "--json")).stdout);
    expect(parsed.status).toBe("active");
    expect(parsed.tasks[0].slug).toBe("add-login");

    const next = JSON.parse((await wf("batch", "next", "--json")).stdout);
    expect(next.id).toBe(1);
    expect(next.path).toBe("extras/brainstorm/add-login.md");
  });
});

describe("running a batch", () => {
  test("runs tasks in order, recording each commit", async () => {
    await notes("Add login", "Rate limit the API");
    await wf("batch", "create", "add-login", "rate-limit-the-api");

    expect((await wf("batch", "start", "2")).code).toBe(1);
    expect((await wf("batch", "start", "1")).code).toBe(0);
    expect((await wf("batch", "done", "1", "--commit", "abc1234")).stdout).toContain("abc1234");

    expect((await wf("batch", "next")).stdout).toContain("#2  Rate limit the API");
    await wf("batch", "start", "2");
    await wf("batch", "done", "2", "--commit", "def5678");

    const status = await wf("batch", "status");
    expect(status.stdout).toContain("Batch: completed");
    expect(status.stdout).toContain("workflow batch clear");
  });

  test("failing a task stops the batch and requires a reason", async () => {
    await notes("Add login", "Rate limit the API");
    await wf("batch", "create", "add-login", "rate-limit-the-api");
    await wf("batch", "start", "1");

    const noReason = await wf("batch", "fail", "1");
    expect(noReason.code).toBe(1);
    expect(noReason.stderr).toContain("--reason");

    const failed = await wf("batch", "fail", "1", "--reason", "the suite is red");
    expect(failed.stdout).toContain("the suite is red");
    expect((await wf("batch", "status")).stdout).toContain("Batch: stopped");
    expect((await wf("batch", "start", "2")).code).toBe(1);
  });
});

describe("developer controls", () => {
  test("stop and resume", async () => {
    await notes("Add login", "Rate limit the API");
    await wf("batch", "create", "add-login", "rate-limit-the-api");
    await wf("batch", "start", "1");

    expect((await wf("batch", "stop", "--reason", "lunch")).stdout).toContain("Batch stopped");
    expect((await wf("batch", "status")).stdout).toContain("#1  pending");
    expect((await wf("batch", "resume")).stdout).toContain("Next: #1");
  });

  test("remove drops queued tasks but keeps their notes", async () => {
    await notes("Add login", "Rate limit the API");
    await wf("batch", "create", "add-login", "rate-limit-the-api");

    expect((await wf("batch", "remove", "2")).stdout).toContain("Removed #2");
    expect((await wf("batch", "status")).stdout).not.toContain("Rate limit");
    expect(existsSync(join(project, "extras/brainstorm/rate-limit-the-api.md"))).toBe(true);
  });

  test("revert prints the git command that undoes the task", async () => {
    await notes("Add login");
    await wf("batch", "create", "add-login");
    await wf("batch", "start", "1");
    await wf("batch", "done", "1", "--commit", "abc1234");

    const res = await wf("batch", "revert", "1");
    expect(res.stdout).toContain("git revert --no-edit abc1234");
    expect((await wf("batch", "status")).stdout).toContain("#1  reverted");
  });
});

describe("workflow batch clear", () => {
  test("deletes implemented notes, keeps the rest, and frees the slot", async () => {
    await notes("Add login", "Rate limit the API");
    await wf("batch", "create", "add-login", "rate-limit-the-api");
    await wf("batch", "start", "1");
    await wf("batch", "done", "1", "--commit", "abc1234");
    await wf("batch", "stop");

    const cleared = await wf("batch", "clear");
    expect(cleared.stdout).toContain("deleted extras/brainstorm/add-login.md");
    expect(cleared.stdout).toContain("kept    extras/brainstorm/rate-limit-the-api.md");
    expect(existsSync(join(project, "extras/brainstorm/add-login.md"))).toBe(false);
    expect(existsSync(join(project, "extras/brainstorm/rate-limit-the-api.md"))).toBe(true);

    expect((await wf("batch", "create", "rate-limit-the-api")).code).toBe(0);
  });

  test("refuses to clear a running batch", async () => {
    await notes("Add login");
    await wf("batch", "create", "add-login");
    const res = await wf("batch", "clear");
    expect(res.code).toBe(1);
    expect(res.stderr).toContain("still active");
  });
});
