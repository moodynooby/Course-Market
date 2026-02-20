import { describe, it, expect } from 'vitest';
import { generateId } from './id';

describe('generateId', () => {
  it('generates a non-empty string', () => {
    const id = generateId();
    expect(id).toBeTypeOf('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('generates IDs with expected format', () => {
    const id = generateId();
    // Should be alphanumeric (base 36)
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});
