// Netlify Function for Course Trading Board
// This function provides CRUD operations for trade posts using Neon/PostgreSQL

interface TradePost {
  id: string;
  userId: string;
  userDisplayName: string;
  courseCode: string;
  courseName: string;
  sectionOffered: string;
  sectionWanted: string;
  action: 'offer' | 'request';
  status: 'open' | 'pending' | 'completed' | 'cancelled';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

// Neon/PostgreSQL connection (if available)
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

let db: any = null;

async function initDatabase() {
  if (!DATABASE_URL || db) return;
  
  try {
    const { Client } = await import('pg');
    db = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await db.connect();
    
    // Create tables if they don't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        user_display_name TEXT NOT NULL,
        course_code TEXT NOT NULL,
        course_name TEXT,
        section_offered TEXT NOT NULL,
        section_wanted TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('offer', 'request')),
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'completed', 'cancelled')),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    console.log('Database initialized');
  } catch (error) {
    console.warn('Failed to initialize database, using in-memory store:', error);
    db = null;
  }
}

// In-memory store as fallback
const memoryStore = {
  users: new Map<string, UserProfile>(),
  trades: new Map<string, TradePost>(),
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

async function getTrades(): Promise<TradePost[]> {
  if (db) {
    try {
      const result = await db.query('SELECT * FROM trades ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      console.warn('Database query failed, using memory store:', error);
    }
  }
  
  return Array.from(memoryStore.trades.values());
}

async function createTrade(tradeData: Omit<TradePost, 'id' | 'createdAt' | 'updatedAt'>): Promise<TradePost> {
  const trade: TradePost = {
    ...tradeData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (db) {
    try {
      const result = await db.query(`
        INSERT INTO trades (
          id, user_id, user_display_name, course_code, course_name,
          section_offered, section_wanted, action, status, description,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [
        trade.id, trade.userId, trade.userDisplayName, trade.courseCode,
        trade.courseName, trade.sectionOffered, trade.sectionWanted,
        trade.action, trade.status, trade.description || null
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.warn('Database insert failed, using memory store:', error);
    }
  }

  memoryStore.trades.set(trade.id, trade);
  return trade;
}

async function updateTradeStatus(tradeId: string, status: string): Promise<TradePost | null> {
  if (db) {
    try {
      const result = await db.query(`
        UPDATE trades 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [status, tradeId]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.warn('Database update failed, using memory store:', error);
    }
  }

  const trade = memoryStore.trades.get(tradeId);
  if (trade) {
    trade.status = status as any;
    trade.updatedAt = new Date().toISOString();
    memoryStore.trades.set(tradeId, trade);
    return trade;
  }
  
  return null;
}

async function deleteTrade(tradeId: string): Promise<boolean> {
  if (db) {
    try {
      const result = await db.query('DELETE FROM trades WHERE id = $1', [tradeId]);
      return result.rowCount > 0;
    } catch (error) {
      console.warn('Database delete failed, using memory store:', error);
    }
  }

  return memoryStore.trades.delete(tradeId);
}

async function createUser(userData: UserProfile): Promise<UserProfile> {
  if (db) {
    try {
      const result = await db.query(`
        INSERT INTO users (id, display_name, email, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          email = EXCLUDED.email
        RETURNING *
      `, [userData.id, userData.displayName, userData.email]);
      
      return result.rows[0];
    } catch (error) {
      console.warn('Database user create failed, using memory store:', error);
    }
  }

  memoryStore.users.set(userData.id, userData);
  return userData;
}

exports.handler = async (event: any, _context: any) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    await initDatabase();

    const { httpMethod, path, body } = event;
    const requestBody = body ? JSON.parse(body) : {};

    // GET /trades - Get all trades
    if (httpMethod === 'GET' && path.endsWith('/trades')) {
      const trades = await getTrades();
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades }),
      };
    }

    // POST /trades - Create trade or user
    if (httpMethod === 'POST' && path.endsWith('/trades')) {
      const { action, trade, user } = requestBody;

      if (action === 'createUser' && user) {
        const newUser = await createUser(user);
        return {
          statusCode: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: newUser }),
        };
      }

      if (action === 'createTrade' && trade) {
        const newTrade = await createTrade(trade);
        return {
          statusCode: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ trade: newTrade }),
        };
      }

      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid request' }),
      };
    }

    // PUT /trades - Update trade status
    if (httpMethod === 'PUT' && path.endsWith('/trades')) {
      const { action, tradeId, status } = requestBody;

      if (action === 'updateTrade' && tradeId && status) {
        const updatedTrade = await updateTradeStatus(tradeId, status);
        
        if (updatedTrade) {
          return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ trade: updatedTrade }),
          };
        } else {
          return {
            statusCode: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Trade not found' }),
          };
        }
      }

      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid request' }),
      };
    }

    // DELETE /trades - Delete trade
    if (httpMethod === 'DELETE' && path.endsWith('/trades')) {
      const { action, tradeId } = requestBody;

      if (action === 'deleteTrade' && tradeId) {
        const deleted = await deleteTrade(tradeId);
        
        return {
          statusCode: deleted ? 200 : 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: deleted,
            error: deleted ? null : 'Trade not found'
          }),
        };
      }

      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid request' }),
      };
    }

    return {
      statusCode: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Endpoint not found' }),
    };

  } catch (error) {
    console.error('Handler error:', error);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: (error as Error).message
      }),
    };
  }
};