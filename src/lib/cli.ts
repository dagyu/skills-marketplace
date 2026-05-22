/** Small shared helpers for command modules. */

export class CliError extends Error {}

/** Print to stdout. */
export function out(line: string = ""): void {
  process.stdout.write(line + "\n");
}

/** Parse a comma-separated list flag into a trimmed, non-empty string array. */
export function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Validate that a value is one of the allowed options, or throw CliError. */
export function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  flag: string,
): T | undefined {
  if (value === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new CliError(
      `Invalid ${flag} "${value}". Expected one of: ${allowed.join(", ")}.`,
    );
  }
  return value as T;
}
