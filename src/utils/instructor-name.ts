const PLACEHOLDER_NAMES = new Set(['Not added', 'To Be Announced', 'TBA']);

// Between-instructor separators. Upstream data joins multiple instructors with
// a comma ("Smith, Doe" = two people), so comma IS a separator here.
// The old camelCase heuristic (/([a-z])([A-Z])/) is intentionally dropped —
// it split "McDonald" / "MacGregor" / "DeMarco" into bogus pairs.
const SEPARATOR = /\s*(?:,|;|&|\band\b)\s*/i;

function normalizeName(name: string): string {
  return name
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\.\.$/, '')
    .trim();
}

function isPlaceholder(name: string): boolean {
  return PLACEHOLDER_NAMES.has(name) || name === '';
}

export function splitInstructorNames(raw: string): string[] {
  const seen = new Set<string>();

  const parts = raw.replace(/\s{2,}/g, ' ').split(SEPARATOR);

  for (const part of parts) {
    const name = normalizeName(part);
    if (!isPlaceholder(name)) {
      seen.add(name);
    }
  }

  return Array.from(seen);
}
