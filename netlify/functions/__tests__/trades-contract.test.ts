import { describe, expect, it } from 'vitest';
import * as schema from '../../../db/schema';
import { tradeColumns } from '../trades';

describe('trade projection privacy contract', () => {
  it('includes only permitted public fields in tradeColumns', () => {
    const projectedKeys = Object.keys(tradeColumns);

    expect(projectedKeys).toEqual(
      expect.arrayContaining([
        'id',
        'auth0UserId',
        'userDisplayName',
        'userAvatarUrl',
        'courseCode',
        'courseName',
        'sectionOffered',
        'sectionWanted',
        'status',
        'description',
        'contactPhone',
        'createdAt',
        'updatedAt',
      ]),
    );

    expect(projectedKeys).not.toContain('userEmail');
    expect(projectedKeys).not.toContain('email');
    expect(projectedKeys).not.toContain('token');
    expect(projectedKeys).not.toContain('password');
  });

  it('matches database schema trade columns', () => {
    expect(tradeColumns.id).toBe(schema.trades.id);
    expect(tradeColumns.auth0UserId).toBe(schema.trades.auth0UserId);
    expect(tradeColumns.courseCode).toBe(schema.trades.courseCode);
    expect(tradeColumns.status).toBe(schema.trades.status);
  });
});
