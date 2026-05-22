import pkg from "../package.json";

/**
 * `__BUILD_TIME__` is replaced with an ISO timestamp string literal at compile
 * time via `bun build --compile --define` (see scripts/compile.ts). When running
 * from source it is never defined, so the `typeof` guard keeps this safe and we
 * report a dev build instead.
 */
declare const __BUILD_TIME__: string;

export const VERSION: string = pkg.version;

export const BUILD_TIME: string =
  typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev (running from source)";

/** Human-readable version line, e.g. "workflow 0.1.0 (built 2026-05-22T…)". */
export function versionString(): string {
  return `workflow ${VERSION} (built ${BUILD_TIME})`;
}
