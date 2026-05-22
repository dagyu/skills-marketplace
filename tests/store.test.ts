import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TaskStore } from "../src/lib/store.ts";

let dir: string;
let dataFile: string;
let store: TaskStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "wf-store-"));
  dataFile = join(dir, "data.json");
  store = new TaskStore(dataFile);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("TaskStore", () => {
  test("starts empty with nextId 1", () => {
    expect(store.list()).toEqual([]);
  });

  test("create assigns sequential ids and a relative markdown path", () => {
    const a = store.create({ title: "First task" });
    const b = store.create({ title: "Second task" });
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    expect(a.path).toBe("extras/tasks/first-task.md");
    expect(a.status).toBe("todo");
    expect(a.priority).toBe("medium");
    expect(a.labels).toEqual([]);
  });

  test("create persists to disk as { nextId, tasks }", () => {
    store.create({ title: "Persisted", priority: "high", labels: ["a", "b"] });
    const raw = JSON.parse(readFileSync(dataFile, "utf8"));
    expect(raw.nextId).toBe(2);
    expect(raw.tasks).toHaveLength(1);
    expect(raw.tasks[0].labels).toEqual(["a", "b"]);
  });

  test("get returns a task by id and undefined when missing", () => {
    const a = store.create({ title: "Findable" });
    expect(store.get(a.id)?.title).toBe("Findable");
    expect(store.get(999)).toBeUndefined();
  });

  test("update patches fields and bumps updatedAt", async () => {
    const a = store.create({ title: "Before" });
    await Bun.sleep(2);
    const updated = store.update(a.id, { status: "done", title: "After" });
    expect(updated?.status).toBe("done");
    expect(updated?.title).toBe("After");
    expect(updated?.updatedAt).not.toBe(a.updatedAt);
  });

  test("delete removes the task and returns it", () => {
    const a = store.create({ title: "Doomed" });
    const removed = store.delete(a.id);
    expect(removed?.id).toBe(a.id);
    expect(store.list()).toEqual([]);
    expect(store.delete(a.id)).toBeUndefined();
  });

  test("list filters by status, priority and label", () => {
    store.create({ title: "one", priority: "high", labels: ["ui"] });
    const two = store.create({ title: "two", priority: "low", labels: ["api"] });
    store.update(two.id, { status: "done" });
    expect(store.list({ priority: "high" }).map((t) => t.title)).toEqual(["one"]);
    expect(store.list({ status: "done" }).map((t) => t.title)).toEqual(["two"]);
    expect(store.list({ label: "api" }).map((t) => t.title)).toEqual(["two"]);
  });

  test("create stores dependsOn only when it is non-empty", () => {
    const a = store.create({ title: "base" });
    const b = store.create({ title: "needs base", dependsOn: [a.id] });
    expect(b.dependsOn).toEqual([a.id]);
    expect("dependsOn" in a).toBe(false);
    const raw = JSON.parse(readFileSync(dataFile, "utf8"));
    expect("dependsOn" in raw.tasks[0]).toBe(false);
    expect(raw.tasks[1].dependsOn).toEqual([a.id]);
  });

  test("update sets dependsOn and an empty array clears it", () => {
    const a = store.create({ title: "a" });
    const b = store.create({ title: "b" });
    store.update(b.id, { dependsOn: [a.id] });
    expect(store.get(b.id)?.dependsOn).toEqual([a.id]);
    store.update(b.id, { dependsOn: [] });
    expect("dependsOn" in (store.get(b.id) as object)).toBe(false);
  });

  test("a second store instance reads existing data and keeps ids monotonic", () => {
    store.create({ title: "kept" });
    const reopened = new TaskStore(dataFile);
    const next = reopened.create({ title: "added" });
    expect(next.id).toBe(2);
    expect(reopened.list()).toHaveLength(2);
  });

  test("ids stay monotonic even after the highest task is deleted", () => {
    const a = store.create({ title: "a" });
    store.create({ title: "b" });
    store.delete(a.id);
    const c = store.create({ title: "c" });
    expect(c.id).toBe(3);
  });

  test("does not create the data file until a write happens", () => {
    expect(existsSync(dataFile)).toBe(false);
    store.list();
    expect(existsSync(dataFile)).toBe(false);
    store.create({ title: "now it writes" });
    expect(existsSync(dataFile)).toBe(true);
  });
});
