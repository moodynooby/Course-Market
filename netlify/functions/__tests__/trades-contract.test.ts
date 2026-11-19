import { describe, expect, it } from 'vitest';
import { tradeColumns } from '../trades';

describe('trade projection privacy contract', () => {
  it('selects exactly the permitted public fields', () => {
    expect(Object.keys(tradeColumns)).toEqual([
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
    ]);
  });
});
