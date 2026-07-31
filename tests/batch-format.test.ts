import { describe, expect, test } from "bun:test";
import { decodeBatch, decodeBatches, encodeBatch } from "../src/lib/batch-format.ts";
import type { Batch } from "../src/types.ts";

const RUN: Batch = {
  status: "completed",
  createdAt: 1753948128,
  tasks: [
    {
      id: 1,
      slug: "cache-user-profiles",
      title: "Cache user profiles",
      status: "done",
      startedAt: 1753948130,
      seconds: 64,
      commit: "deadbee",
    },
    { id: 2, slug: "add-login-flow", title: "Add login flow", status: "pending" },
  ],
};

describe("encodeBatch", () => {
  test("writes one tab-separated record per line", () => {
    expect(encodeBatch(RUN)).toBe(
      [
        "b\tc\t1753948128",
        "t\t1\td\tcache-user-profiles\tCache user profiles\t1753948130\t64\tdeadbee",
        "t\t2\tp\tadd-login-flow\tAdd login flow",
        "",
      ].join("\n"),
    );
  });

  test("drops trailing absent fields, so a queued task stays short", () => {
    const line = encodeBatch(RUN).split("\n")[2]!;
    expect(line.split("\t")).toHaveLength(5);
  });

  test("stays well under the JSON encoding of the same batch", () => {
    expect(encodeBatch(RUN).length).toBeLessThan(JSON.stringify(RUN, null, 2).length / 3);
  });
});

describe("round trip", () => {
  test("decodes back to the original batch", () => {
    expect(decodeBatch(encodeBatch(RUN))).toEqual(RUN);
  });

  test("survives tabs, newlines and backslashes in free text", () => {
    const batch: Batch = {
      status: "stopped",
      createdAt: 1,
      tasks: [
        {
          id: 1,
          slug: "odd",
          title: "A\ttitle\nwith C:\\paths",
          status: "failed",
          note: "line one\nline two",
        },
      ],
    };
    const encoded = encodeBatch(batch);
    expect(encoded.split("\n")).toHaveLength(3); // header, one task, trailing newline
    expect(decodeBatch(encoded)).toEqual(batch);
  });

  test("every status code survives the trip", () => {
    const batch: Batch = {
      status: "active",
      createdAt: 1,
      tasks: (["pending", "in-progress", "done", "failed", "reverted"] as const).map(
        (status, i) => ({ id: i + 1, slug: `s${i}`, title: `T${i}`, status }),
      ),
    };
    expect(decodeBatch(encodeBatch(batch))).toEqual(batch);
  });
});

describe("decodeBatches", () => {
  test("reads an appended history as one batch per block", () => {
    const runs = decodeBatches(encodeBatch(RUN) + encodeBatch({ ...RUN, createdAt: 1753949000 }));
    expect(runs).toHaveLength(2);
    expect(runs.map((r) => r.createdAt)).toEqual([1753948128, 1753949000]);
  });

  test("ignores blank lines and comments", () => {
    expect(decodeBatches("\n# a legend\nb\ta\t1\n\n")).toEqual([
      { status: "active", createdAt: 1, tasks: [] },
    ]);
  });

  test("returns nothing for an empty file", () => {
    expect(decodeBatches("")).toEqual([]);
    expect(decodeBatch("")).toBeUndefined();
  });
});

describe("malformed input", () => {
  test("rejects an unknown record type", () => {
    expect(() => decodeBatches("x\t1\n")).toThrow(/unknown record "x"/);
  });

  test("rejects an unknown status code", () => {
    expect(() => decodeBatches("b\tz\t1\n")).toThrow(/unknown batch status "z"/);
  });

  test("rejects a task with no batch above it", () => {
    expect(() => decodeBatches("t\t1\tp\ts\tT\n")).toThrow(/task before any batch/);
  });

  test("rejects a non-numeric timestamp, naming the line", () => {
    expect(() => decodeBatches("b\ta\tyesterday\n")).toThrow(/created "yesterday".*line 1/);
  });

  test("rejects a task missing its title", () => {
    expect(() => decodeBatches("b\ta\t1\nt\t1\tp\tslug\n")).toThrow(/missing title.*line 2/);
  });
});
