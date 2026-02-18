// Netlify Function for CSV Parsing Rules
import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

// Define schema locally for the function or import if possible
// Importing from ../../db/schema might be tricky due to Netlify function build process
// For now, we define the table we need to ensure consistency
const csvParsingRules = pgTable('csv_parsing_rules', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  originalValue: text('original_value').notNull(),
  mappedValue: text('mapped_value').notNull(),
  explanation: text('explanation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

let db: any = null;

function getDb() {
  if (db) return db;
  if (!DATABASE_URL) return null;
  const client = neon(DATABASE_URL);
  db = drizzle(client);
  return db;
}

exports.handler = async (event: any) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const db = getDb();
  const { httpMethod, queryStringParameters, body } = event;

  try {
    if (httpMethod === 'GET') {
      const userId = queryStringParameters?.userId;
      if (!userId) return { statusCode: 400, headers: corsHeaders, body: 'Missing userId' };

      let rules = [];
      if (db) {
        rules = await db.select().from(csvParsingRules).where(eq(csvParsingRules.userId, userId));
      }
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ rules }),
      };
    }

    if (httpMethod === 'POST') {
      const { rule } = JSON.parse(body);
      if (!rule || !rule.userId) return { statusCode: 400, headers: corsHeaders, body: 'Invalid rule data' };

      if (db) {
        const [insertedRule] = await db.insert(csvParsingRules).values({
          userId: rule.userId,
          type: rule.type,
          originalValue: rule.originalValue,
          mappedValue: rule.mappedValue,
          explanation: rule.explanation
        }).returning();

        return {
          statusCode: 201,
          headers: corsHeaders,
          body: JSON.stringify({ rule: insertedRule }),
        };
      }
      return { statusCode: 503, headers: corsHeaders, body: 'Database unavailable' };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }

  return { statusCode: 404, headers: corsHeaders, body: 'Not Found' };
};
