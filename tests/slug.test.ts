import { describe, expect, test } from "bun:test";
import { slugify } from "../src/lib/slug.ts";

describe("slugify", () => {
  test("lowercases and hyphenates spaces", () => {
    expect(slugify("Add Login Flow")).toBe("add-login-flow");
  });

  test("strips punctuation", () => {
    expect(slugify("Fix the bug!! (urgent)")).toBe("fix-the-bug-urgent");
  });

  test("collapses repeated separators", () => {
    expect(slugify("a   b___c")).toBe("a-b-c");
  });

  test("trims leading and trailing separators", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });

  test("falls back to 'untitled' when empty", () => {
    expect(slugify("!!!")).toBe("untitled");
  });

  test("keeps numbers", () => {
    expect(slugify("Phase 2 plan")).toBe("phase-2-plan");
  });
});
