import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "..", "src", "index.ts");
let project: string;

/** Run the CLI binary inside the temp project; return stdout/stderr/exit code. */
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

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "wf-cli-"));
});

afterEach(() => {
  rmSync(project, { recursive: true, force: true });
});

describe("workflow init", () => {
  test("scaffolds the folder structure and is idempotent", async () => {
    const first = await wf("init");
    expect(first.code).toBe(0);
    expect(existsSync(join(project, "extras/brainstorm"))).toBe(true);
    expect(existsSync(join(project, "extras/tasks/data.json"))).toBe(true);
    expect(existsSync(join(project, "extras/manifesto/MANIFESTO.md"))).toBe(true);
    expect(existsSync(join(project, "extras/internals/INTERNALS.md"))).toBe(true);
    expect(existsSync(join(project, "docs/README.md"))).toBe(true);
    expect(existsSync(join(project, "README.md"))).toBe(true);
    expect(existsSync(join(project, "CLAUDE.md"))).toBe(true);

    const second = await wf("init");
    expect(second.stdout).toContain("already exists");
  });

  test("scaffolded CLAUDE.md points the agent at the internals guide", async () => {
    await wf("init");
    const claude = readFileSync(join(project, "CLAUDE.md"), "utf8");
    expect(claude).toContain("extras/internals/INTERNALS.md");
  });
});

describe("workflow brainstorm", () => {
  test("new creates a titled markdown file and list shows it", async () => {
    await wf("init");
    const created = await wf("brainstorm", "new", "Add Login");
    expect(created.code).toBe(0);
    expect(existsSync(join(project, "extras/brainstorm/add-login.md"))).toBe(true);
    expect(readFileSync(join(project, "extras/brainstorm/add-login.md"), "utf8")).toContain(
      "# Add Login",
    );

    const listed = await wf("brainstorm", "list");
    expect(listed.stdout).toContain("Add Login");
  });

  test("delete removes a note (by title or slug) and errors when missing", async () => {
    await wf("init");
    await wf("brainstorm", "new", "Add Login");
    expect(existsSync(join(project, "extras/brainstorm/add-login.md"))).toBe(true);

    const del = await wf("brainstorm", "delete", "Add Login");
    expect(del.code).toBe(0);
    expect(existsSync(join(project, "extras/brainstorm/add-login.md"))).toBe(false);

    const again = await wf("brainstorm", "delete", "add-login");
    expect(again.code).toBe(1);
    expect(again.stderr).toContain("add-login");
  });
});

describe("workflow task", () => {
  test("full lifecycle: create, list, get, update, delete", async () => {
    await wf("init");

    const created = await wf(
      "task",
      "create",
      "--title",
      "Login form",
      "--priority",
      "high",
      "--labels",
      "ui,auth",
      "--description",
      "Build the login form",
    );
    expect(created.code).toBe(0);
    expect(created.stdout.trim()).toBe("1");

    // Metadata persisted correctly.
    const data = JSON.parse(readFileSync(join(project, "extras/tasks/data.json"), "utf8"));
    expect(data.nextId).toBe(2);
    expect(data.tasks[0]).toMatchObject({
      id: 1,
      title: "Login form",
      priority: "high",
      labels: ["ui", "auth"],
      status: "todo",
      path: "extras/tasks/login-form.md",
    });
    expect(existsSync(join(project, "extras/tasks/login-form.md"))).toBe(true);

    // list
    const list = await wf("task", "list");
    expect(list.stdout).toContain("#1");
    expect(list.stdout).toContain("Login form");

    // get --json includes the body
    const got = await wf("task", "get", "1", "--json");
    const parsed = JSON.parse(got.stdout);
    expect(parsed.title).toBe("Login form");
    expect(parsed.body).toContain("# Login form");

    // update status
    await wf("task", "update", "1", "--status", "done");
    const doneList = await wf("task", "list", "--status", "done", "--json");
    expect(JSON.parse(doneList.stdout)).toHaveLength(1);

    // delete removes data + markdown
    await wf("task", "delete", "1");
    expect(existsSync(join(project, "extras/tasks/login-form.md"))).toBe(false);
    const empty = await wf("task", "list", "--json");
    expect(JSON.parse(empty.stdout)).toEqual([]);
  });

  test("create with --body-file seeds the description markdown", async () => {
    await wf("init");
    const bodyFile = join(project, "body.md");
    writeFileSync(bodyFile, "# Custom\n\nDetailed spec here.\n");
    await wf("task", "create", "--title", "Has body", "--body-file", bodyFile);
    const body = readFileSync(join(project, "extras/tasks/has-body.md"), "utf8");
    expect(body).toContain("Detailed spec here.");
  });

  test("rejects an invalid priority with a non-zero exit", async () => {
    await wf("init");
    const res = await wf("task", "create", "--title", "x", "--priority", "urgent");
    expect(res.code).toBe(1);
    expect(res.stderr).toContain("Invalid --priority");
  });

  test("missing --title fails", async () => {
    await wf("init");
    const res = await wf("task", "create", "--priority", "low");
    expect(res.code).toBe(1);
    expect(res.stderr).toContain("--title is required");
  });

  test("create without --depends-on omits the field; with it populates it", async () => {
    await wf("init");
    await wf("task", "create", "--title", "Base");
    const indep = JSON.parse((await wf("task", "get", "1", "--json")).stdout);
    expect("dependsOn" in indep).toBe(false);

    await wf("task", "create", "--title", "Dependent", "--depends-on", "1");
    const dep = JSON.parse((await wf("task", "get", "2", "--json")).stdout);
    expect(dep.dependsOn).toEqual([1]);
  });

  test("--depends-on referencing an unknown task fails", async () => {
    await wf("init");
    const res = await wf("task", "create", "--title", "Orphan", "--depends-on", "99");
    expect(res.code).toBe(1);
    expect(res.stderr).toContain("99");
  });

  test("update can set and then clear dependsOn", async () => {
    await wf("init");
    await wf("task", "create", "--title", "Base");
    await wf("task", "create", "--title", "Dependent");
    await wf("task", "update", "2", "--depends-on", "1");
    expect(JSON.parse((await wf("task", "get", "2", "--json")).stdout).dependsOn).toEqual([1]);
    await wf("task", "update", "2", "--depends-on", "");
    expect("dependsOn" in JSON.parse((await wf("task", "get", "2", "--json")).stdout)).toBe(false);
  });

  test("a task cannot depend on itself", async () => {
    await wf("init");
    await wf("task", "create", "--title", "Solo");
    const res = await wf("task", "update", "1", "--depends-on", "1");
    expect(res.code).toBe(1);
    expect(res.stderr).toContain("itself");
  });

  test("only one task can be in progress (lock) and `current` reports it", async () => {
    await wf("init");
    await wf("task", "create", "--title", "First");
    await wf("task", "create", "--title", "Second");

    expect((await wf("task", "current")).stdout).toContain("No task in progress");

    expect((await wf("task", "update", "1", "--status", "in-progress")).code).toBe(0);
    const cur = await wf("task", "current");
    expect(cur.stdout).toContain("#1");
    expect(cur.stdout).toContain("First");

    const blocked = await wf("task", "update", "2", "--status", "in-progress");
    expect(blocked.code).toBe(1);
    expect(blocked.stderr).toContain("#1");
  });
});
