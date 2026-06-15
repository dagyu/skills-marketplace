import { CliError, out } from "../lib/cli.ts";

// Embedded with `type: "file"` (see init.ts): each import resolves to the path
// of the guidance template, bundled into the compiled binary.
import manifestoInfo from "../../templates/manifesto-info.md" with { type: "file" };
import internalsInfo from "../../templates/internals-info.md" with { type: "file" };

/**
 * The `manifesto` and `internals` commands exist solely to teach the agent how
 * to populate the matching file: `init` scaffolds a stub, and `<doc> info`
 * prints the instructions for filling it in by interviewing the developer.
 */
async function printInfo(doc: "manifesto" | "internals", source: string, sub: string | undefined): Promise<void> {
  if (sub !== "info") {
    throw new CliError(
      `Unknown ${doc} command "${sub ?? ""}".\nUsage:\n  workflow ${doc} info    Print instructions for populating ${doc.toUpperCase()}.md`,
    );
  }
  out((await Bun.file(source).text()).trimEnd());
}

export function runManifesto(args: string[]): Promise<void> {
  return printInfo("manifesto", manifestoInfo, args[0]);
}

export function runInternals(args: string[]): Promise<void> {
  return printInfo("internals", internalsInfo, args[0]);
}
