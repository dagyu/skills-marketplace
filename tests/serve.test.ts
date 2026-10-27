import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "..", "src", "index.ts");

let project: string;
let server: ReturnType<typeof Bun.spawn>;
let base: string;

async function wf(...args: string[]): Promise<void> {
  const proc = Bun.spawn(["bun", CLI, ...args], { cwd: project, stdout: "pipe", stderr: "pipe" });
  await proc.exited;
}

async function get(path: string): Promise<Response> {
  return fetch(base + path);
}

/** Poll until the server answers, so the tests do not race its startup. */
async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await get("/api/state")).ok) return;
    } catch {
      // not listening yet
    }
    await Bun.sleep(50);
  }
  throw new Error("the preview server never came up");
}

beforeAll(async () => {
  project = mkdtempSync(join(tmpdir(), "wf-serve-"));
  for (const t of ["Add login", "Rate limit the API"]) {
    const slug = t.toLowerCase().replace(/[^a-z]+/g, "-");
    await wf("task", "new", t);
    const f = join(project, "extras/tasks", `${slug}.md`);
    writeFileSync(f, readFileSync(f, "utf8") + "\n## Goal\nx\n## Approach\nx\n## Where it lives\nx\n## Out of scope\nx\n");
    await wf("task", "set", slug, "ready");
  }
  await wf("batch", "create", "add-login", "rate-limit-the-api");

  const port = 4000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  server = Bun.spawn(["bun", CLI, "serve", "--port", String(port)], {
    cwd: project,
    stdout: "pipe",
    stderr: "pipe",
  });
  await waitForServer();
});

afterAll(() => {
  server?.kill();
  rmSync(project, { recursive: true, force: true });
});

describe("GET /", () => {
  test("serves the single-page app", async () => {
    const res = await get("/");
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("workflow preview");
  });

  test("unknown paths 404", async () => {
    expect((await get("/nope")).status).toBe(404);
  });
});

describe("GET /api/state", () => {
  test("returns the notes, the live batch and the history", async () => {
    const state = await (await get("/api/state")).json();
    expect(state.tasks.map((n: { slug: string }) => n.slug).sort()).toEqual([
      "add-login",
      "rate-limit-the-api",
    ]);
    expect(state.tasks[0].title).toBeTruthy();
    expect(state.batch.status).toBe("active");
    expect(state.batch.tasks).toHaveLength(2);
    expect(state.history).toEqual([]);
    expect(state.now).toBeGreaterThan(0);
  });
});

describe("GET /api/task/:slug", () => {
  test("returns the note's markdown and title", async () => {
    const note = await (await get("/api/task/add-login")).json();
    expect(note.title).toBe("Add login");
    expect(note.content).toContain("# Add login");
    expect(note.locked).toBe(false);
  });

  test("404s for a note that does not exist", async () => {
    expect((await get("/api/task/nope")).status).toBe(404);
  });

  test("path traversal cannot escape the tasks folder", async () => {
    expect((await get("/api/task/" + encodeURIComponent("../../../etc/passwd"))).status).toBe(404);
  });
});

describe("PUT /api/task/:slug", () => {
  async function put(slug: string, body: string): Promise<Response> {
    return fetch(`${base}/api/task/${slug}`, { method: "PUT", body });
  }

  test("writes the edit straight to the file on disk", async () => {
    const edited = "# Add login\n\n## Goal\nLet people in.\n";
    expect((await put("add-login", edited)).ok).toBe(true);
    expect(readFileSync(join(project, "extras/tasks/add-login.md"), "utf8")).toBe(edited);
    expect((await (await get("/api/task/add-login")).json()).content).toBe(edited);
  });

  test("refuses to edit the note a subagent is implementing", async () => {
    await wf("batch", "start", "1");
    expect((await (await get("/api/task/add-login")).json()).locked).toBe(true);

    const res = await put("add-login", "# clobbered\n");
    expect(res.status).toBe(409);
    expect(await res.text()).toContain("being implemented");
    expect(readFileSync(join(project, "extras/tasks/add-login.md"), "utf8")).toContain("Goal");

    // A note that is merely queued stays editable.
    expect((await put("rate-limit-the-api", "# Rate limit the API\n\nedited\n")).ok).toBe(true);
    await wf("batch", "stop");
  });

  test("404s for a note that does not exist", async () => {
    expect((await put("nope", "x")).status).toBe(404);
  });
});
