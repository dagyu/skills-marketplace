import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import pkg from "../package.json";
import { BUILD_TIME, VERSION, versionString } from "../src/version.ts";

const CLI = join(import.meta.dir, "..", "src", "index.ts");

describe("version module", () => {
  test("VERSION is the single source of truth from package.json", () => {
    expect(VERSION).toBe(pkg.version);
  });

  test("versionString includes the version and the build time", () => {
    const s = versionString();
    expect(s).toContain(VERSION);
    expect(s).toContain(BUILD_TIME);
  });

  test("BUILD_TIME marks source runs as a dev build (no compile-time stamp)", () => {
    // When running from source nothing has injected a real timestamp.
    expect(BUILD_TIME).toContain("dev");
  });
});

describe("workflow --version", () => {
  async function run(arg: string): Promise<string> {
    const proc = Bun.spawn(["bun", CLI, arg], { stdout: "pipe", stderr: "pipe" });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    return stdout;
  }

  test("--version prints the version line", async () => {
    expect(await run("--version")).toContain(pkg.version);
  });

  test("-v is an alias", async () => {
    expect(await run("-v")).toContain(pkg.version);
  });
});
