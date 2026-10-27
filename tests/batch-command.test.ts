import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

/** Create ready tasks so they can be queued. */
async function notes(...titles: string[]): Promise<void> {
  for (const title of titles) {
    const file = (await wf("task", "new", title)).stdout.trim();
    writeFileSync(
      file,
      readFileSync(file, "utf8") +
        "\n## Goal\nx\n\n## Approach\nx\n\n## Where it lives\nx\n\n## Out of scope\nx\n",
    );
    await wf("task", "set", title, "ready");
  }
}

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "wf-batch-cli-"));
});

afterEach(() => {
  rmSync(project, { recursive: true, force: true });
});

describe("workflow batch create", () => {
  test("refuses a task that is still a brainstorm", async () => {
    await wf("task", "new", "Half baked");
    const res = await wf("batch", "create", "half-baked");
    expect(res.code).toBe(1);
    expect(res.stderr).toContain("not ready");
  });

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
    expect(res.stderr).toContain("No task");
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
    expect(next.path).toBe("extras/tasks/add-login.md");
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
    expect(existsSync(join(project, "extras/tasks/rate-limit-the-api.md"))).toBe(true);
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
    expect(cleared.stdout).toContain("deleted extras/tasks/add-login.md");
    expect(cleared.stdout).toContain("kept    extras/tasks/rate-limit-the-api.md");
    expect(existsSync(join(project, "extras/tasks/add-login.md"))).toBe(false);
    expect(existsSync(join(project, "extras/tasks/rate-limit-the-api.md"))).toBe(true);

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

describe("workflow batch history", () => {
  test("records each cleared run with its tasks, timings and commits", async () => {
    expect((await wf("batch", "history")).stdout).toContain("No finished runs yet");

    await notes("Add login", "Rate limit the API");
    await wf("batch", "create", "add-login", "rate-limit-the-api");
    await wf("batch", "start", "1");
    await wf("batch", "done", "1", "--commit", "abc1234");
    await wf("batch", "start", "2");
    await wf("batch", "fail", "2", "--reason", "the suite is red");
    await wf("batch", "clear");

    const history = await wf("batch", "history");
    expect(history.stdout).toContain("1/2 shipped");
    expect(history.stdout).toContain("#1  done        Add login");
    expect(history.stdout).toContain("abc1234");
    expect(history.stdout).toContain("the suite is red");

    const runs = JSON.parse((await wf("batch", "history", "--json")).stdout);
    expect(runs).toHaveLength(1);
    expect(runs[0].tasks[0].seconds).toBeGreaterThanOrEqual(0);
  });

  test("stores the run as tab-separated records, not JSON", async () => {
    await notes("Add login");
    await wf("batch", "create", "add-login");
    await wf("batch", "start", "1");
    await wf("batch", "done", "1", "--commit", "abc1234");
    await wf("batch", "clear");

    const history = readFileSync(join(project, "extras/batch/history"), "utf8");
    const [header, task] = history.trimEnd().split("\n");
    expect(header!.split("\t")[0]).toBe("b");
    expect(task!.split("\t").slice(0, 4)).toEqual(["t", "1", "d", "add-login"]);
    expect(history).not.toContain("{");
  });

  test("the live batch file is the same compact format", async () => {
    await notes("Add login");
    await wf("batch", "create", "add-login");
    const live = readFileSync(join(project, "extras/batch/batch"), "utf8");
    expect(live).toMatch(/^b\ta\t\d+\n/);
    expect(live).toContain("t\t1\tp\tadd-login\tAdd login\n");
  });
});
