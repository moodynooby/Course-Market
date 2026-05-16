#!/usr/bin/env tsx
/**
 * Seed a semester record into the `semesters` database table.
 *
 * Usage:
 *   npx tsx scripts/seed-semester.ts Monsoon2026 "Monsoon Semester 2026"
 *   npx tsx scripts/seed-semester.ts Monsoon2026 "Monsoon Semester 2026" --deactivate-others
 */

import { eq, ne } from 'drizzle-orm';
import { db } from '../db';
import { semesters } from '../db/schema';

async function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith('--'));
  const positional = args.filter((a) => !a.startsWith('--'));

  if (positional.length < 2) {
    console.log(
      'Usage: npx tsx scripts/seed-semester.ts <semester-id> <semester-name> [--deactivate-others]',
    );
    console.log('\nExamples:');
    console.log('  npx tsx scripts/seed-semester.ts Monsoon2026 "Monsoon Semester 2026"');
    console.log(
      '  npx tsx scripts/seed-semester.ts Monsoon2026 "Monsoon Semester 2026" --deactivate-others',
    );
    process.exit(1);
  }

  const [semesterId, semesterName] = positional;
  const deactivateOthers = flags.includes('--deactivate-others');
  const jsonUrl = `/semesters/${semesterId}.json`;

  console.log(`Seeding semester: ${semesterId} ("${semesterName}")`);
  console.log(`JSON URL: ${jsonUrl}`);

  const existing = await db.select().from(semesters).where(eq(semesters.id, semesterId)).limit(1);

  if (existing.length > 0) {
    console.log(`Semester "${semesterId}" already exists. Updating...`);
    const [updated] = await db
      .update(semesters)
      .set({ name: semesterName, jsonUrl, isActive: true })
      .where(eq(semesters.id, semesterId))
      .returning();
    console.log('Updated:', updated);
  } else {
    console.log(`Creating new semester "${semesterId}"...`);
    const [inserted] = await db
      .insert(semesters)
      .values({ id: semesterId, name: semesterName, jsonUrl, isActive: true })
      .returning();
    console.log('Inserted:', inserted);
  }

  if (deactivateOthers) {
    console.log('Deactivating all other semesters...');
    await db.update(semesters).set({ isActive: false }).where(ne(semesters.id, semesterId));
    console.log('Done.');
  }

  const all = await db.select().from(semesters).orderBy(semesters.id);
  console.log('\nAll semesters:');
  for (const s of all) {
    console.log(`  ${s.id} | ${s.name} | active: ${s.isActive} | ${s.jsonUrl}`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
