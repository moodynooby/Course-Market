const PLACEHOLDER_NAMES = new Set(['Not added', 'To Be Announced', 'TBA']);

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

  const parts = raw
    .replace(/\s{2,}/g, ' ')
    .split(',')
    .flatMap((part) =>
      part
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1\x00$2')
        .split('\x00'),
    );

  for (const part of parts) {
    const name = normalizeName(part);
    if (!isPlaceholder(name)) {
      seen.add(name);
    }
  }

  return Array.from(seen);
}
