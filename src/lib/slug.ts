/**
 * Convert an arbitrary title into a filesystem-safe slug.
 * Lowercases, replaces any run of non-alphanumeric characters with a single
 * hyphen, and trims leading/trailing hyphens. Falls back to "untitled".
 */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "untitled";
}
