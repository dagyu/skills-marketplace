import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BatchStore } from "../src/lib/batch-store.ts";
import type { BatchTaskSpec } from "../src/types.ts";

let dir: string;
let store: BatchStore;

function spec(slug: string): BatchTaskSpec {
  return { title: slug, slug };
}

/** A three-task batch: #1 alpha, #2 beta, #3 gamma. */
function seed(): void {
  store.create([spec("alpha"), spec("beta"), spec("gamma")]);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "wf-batch-"));
  store = new BatchStore(join(dir, "extras/batch/batch"), join(dir, "extras/batch/history"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("create", () => {
  test("numbers tasks in the given order and starts them pending", () => {
    const batch = store.create([spec("beta"), spec("alpha")]);
    expect(batch.status).toBe("active");
    expect(batch.tasks.map((t) => [t.id, t.slug, t.status])).toEqual([
      [1, "beta", "pending"],
      [2, "alpha", "pending"],
    ]);
  });

  test("refuses a second batch while one exists", () => {
    seed();
    expect(() => store.create([spec("delta")])).toThrow(/already active/);
  });

  test("refuses an empty batch", () => {
    expect(() => store.create([])).toThrow(/at least one/i);
  });

  test("read returns undefined when there is no batch", () => {
    expect(store.read()).toBeUndefined();
  });
});

describe("sequential execution", () => {
  test("next is the first pending task", () => {
    seed();
    expect(store.next()?.id).toBe(1);
  });

  test("tasks must start in order", () => {
    seed();
    expect(() => store.start(2)).toThrow(/#1 .* is next/);
  });

  test("only one task may be in progress", () => {
    seed();
    store.start(1);
    expect(store.current()?.id).toBe(1);
    expect(() => store.start(2)).toThrow(/already in progress/);
  });

  test("done frees the queue and advances next", () => {
    seed();
    store.start(1);
    const task = store.finish(1, { status: "done", commit: "abc1234" });
    expect(task.status).toBe("done");
    expect(task.commit).toBe("abc1234");
    expect(store.next()?.id).toBe(2);
  });

  test("a task records how long it took", () => {
    seed();
    const started = store.start(1);
    expect(started.startedAt).toBeGreaterThan(0);
    expect(store.finish(1, { status: "done" }).seconds).toBeGreaterThanOrEqual(0);
  });

  test("finishing a task that is not in progress is refused", () => {
    seed();
    expect(() => store.finish(1, { status: "done" })).toThrow(/not in progress/);
  });

  test("the batch completes once every task is terminal", () => {
    store.create([spec("alpha")]);
    store.start(1);
    store.finish(1, { status: "done" });
    expect(store.read()?.status).toBe("completed");
    expect(store.next()).toBeUndefined();
  });
});

describe("failure", () => {
  test("a failed task stops the batch", () => {
    seed();
    store.start(1);
    store.finish(1, { status: "failed", note: "tests fail" });
    const batch = store.read()!;
    expect(batch.status).toBe("stopped");
    expect(batch.tasks[0]!.note).toBe("tests fail");
    expect(store.next()).toBeUndefined();
  });

  test("a stopped batch refuses to start tasks until resumed", () => {
    seed();
    store.start(1);
    store.finish(1, { status: "failed", note: "boom" });
    expect(() => store.start(2)).toThrow(/stopped/);
    store.resume();
    expect(store.start(2).status).toBe("in-progress");
  });
});

describe("developer controls", () => {
  test("stop returns the in-progress task to pending so it re-runs cleanly", () => {
    seed();
    store.start(1);
    const batch = store.stop("developer interrupted");
    expect(batch.status).toBe("stopped");
    expect(batch.tasks[0]!.status).toBe("pending");
    expect(batch.tasks[0]!.startedAt).toBeUndefined();
    expect(batch.tasks[0]!.seconds).toBeUndefined();
    expect(batch.tasks[0]!.note).toContain("developer interrupted");
  });

  test("resume needs something left to run", () => {
    store.create([spec("alpha")]);
    store.start(1);
    store.finish(1, { status: "failed", note: "boom" });
    expect(() => store.resume()).toThrow(/No pending tasks/);
  });

  test("add inserts before a pending task with a fresh id", () => {
    seed();
    store.start(1);
    const [added] = store.add([spec("zeta")], 2);
    expect(added!.id).toBe(4);
    expect(store.read()!.tasks.map((t) => t.id)).toEqual([1, 4, 2, 3]);
    expect(store.next()!.id).toBe(4);
  });

  test("add appends by default and refuses duplicates or started targets", () => {
    seed();
    store.add([spec("zeta")]);
    expect(store.read()!.tasks.map((t) => t.id)).toEqual([1, 2, 3, 4]);
    expect(() => store.add([spec("zeta")])).toThrow(/already in the batch/);
    store.start(1);
    expect(() => store.add([spec("eta")], 1)).toThrow(/pending task/);
  });

  test("remove drops pending tasks and keeps the remaining ids stable", () => {
    seed();
    store.remove([2]);
    expect(store.read()!.tasks.map((t) => t.id)).toEqual([1, 3]);
  });

  test("remove refuses anything already started", () => {
    seed();
    store.start(1);
    expect(() => store.remove([1])).toThrow(/Only pending tasks/);
  });

  test("revert marks a done task reverted and keeps its commit", () => {
    seed();
    store.start(1);
    store.finish(1, { status: "done", commit: "abc1234" });
    const task = store.revert(1);
    expect(task.status).toBe("reverted");
    expect(task.commit).toBe("abc1234");
  });

  test("revert refuses a task that never completed", () => {
    seed();
    expect(() => store.revert(1)).toThrow(/Only done tasks/);
  });
});

describe("clear and history", () => {
  test("refuses while the batch is active", () => {
    seed();
    expect(() => store.clear()).toThrow(/still active/);
  });

  test("removes the batch once it is stopped, freeing the slot", () => {
    seed();
    store.stop();
    expect(store.clear()?.tasks).toHaveLength(3);
    expect(store.read()).toBeUndefined();
    expect(store.create([spec("delta")]).tasks).toHaveLength(1);
  });

  test("clearing nothing is not an error", () => {
    expect(store.clear()).toBeUndefined();
  });

  test("history is empty until a run is cleared", () => {
    expect(store.history()).toEqual([]);
  });

  test("each cleared run is appended, keeping its tasks, timings and commits", () => {
    store.create([spec("alpha")]);
    store.start(1);
    store.finish(1, { status: "done", commit: "abc1234" });
    store.clear();

    store.create([spec("beta")]);
    store.start(1);
    store.finish(1, { status: "failed", note: "boom" });
    store.clear();

    const runs = store.history();
    expect(runs).toHaveLength(2);
    expect(runs[0]!.status).toBe("completed");
    expect(runs[0]!.tasks[0]).toMatchObject({
      slug: "alpha",
      status: "done",
      commit: "abc1234",
    });
    expect(runs[0]!.tasks[0]!.seconds).toBeGreaterThanOrEqual(0);
    expect(runs[1]!.status).toBe("stopped");
    expect(runs[1]!.tasks[0]).toMatchObject({ slug: "beta", status: "failed", note: "boom" });
  });
});
