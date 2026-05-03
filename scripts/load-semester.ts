import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { syncProfessors } from '../netlify/functions/professors';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: tsx scripts/load-semester.ts <id> <name> <jsonUrl> [isActive]');
    process.exit(1);
  }

  const [id, name, jsonUrl, isActiveStr] = args;
  const isActive = isActiveStr !== 'false';

  const client = neon();
  const db = drizzle({ client, schema });

  console.log(`Upserting semester: ${id} - ${name} - ${jsonUrl} (Active: ${isActive})`);

  await db
    .insert(schema.semesters)
    .values({
      id,
      name,
      jsonUrl,
      isActive,
    })
    .onConflictDoUpdate({
      target: schema.semesters.id,
      set: {
        name,
        jsonUrl,
        isActive,
      },
    });

  console.log('Syncing professors...');
  const result = await syncProfessors(db, id);
  console.log('Sync completed:', result);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error loading semester:', err);
  process.exit(1);
});
