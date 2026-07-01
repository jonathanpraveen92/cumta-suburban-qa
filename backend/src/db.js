const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool = null;
let sqliteDb = null;
let isSQLite = false;

// Helper to initialize SQLite database
function setupSqlite() {
  isSQLite = true;
  const dbPath = path.resolve(__dirname, '../../database/cumta_qa.sqlite');
  
  // Ensure database directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to open SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database at:', dbPath);
      // Enable foreign keys
      sqliteDb.run('PRAGMA foreign_keys = ON;');
    }
  });
}

// Execute queries (Database-agnostic interface)
function query(text, params = []) {
  // Ensure we have a database connection active
  if (isSQLite && !sqliteDb) {
    setupSqlite();
  }

  if (isSQLite) {
    let sqliteText = text;
    // Replace $1, $2, etc. with ?
    sqliteText = sqliteText.replace(/\$\d+/g, '?');
    
    // Replace ILIKE with LIKE (SQLite is case-insensitive for ASCII by default with LIKE)
    sqliteText = sqliteText.replace(/ILIKE/gi, 'LIKE');

    return new Promise((resolve, reject) => {
      const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT');
      const isInsert = sqliteText.trim().toUpperCase().startsWith('INSERT');
      
      if (isSelect) {
        sqliteDb.all(sqliteText, params, (err, rows) => {
          if (err) {
            console.error('SQLite query error:', err, 'SQL:', sqliteText, 'Params:', params);
            reject(err);
          } else {
            resolve({ rows });
          }
        });
      } else {
        sqliteDb.run(sqliteText, params, function(err) {
          if (err) {
            console.error('SQLite execute error:', err, 'SQL:', sqliteText, 'Params:', params);
            reject(err);
          } else {
            const rows = isInsert ? [{ id: this.lastID }] : [];
            resolve({ rows, affectedRows: this.changes, lastID: this.lastID });
          }
        });
      }
    });
  } else {
    // PostgreSQL
    if (!pool) {
      const dbUrl = process.env.DATABASE_URL;
      pool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) ? false : { rejectUnauthorized: false }
      });
    }
    return pool.query(text, params);
  }
}

// Run the schema.sql file to initialize tables
async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  const forceSqlite = process.env.USE_SQLITE === 'true';

  if (!forceSqlite && dbUrl) {
    try {
      console.log('Testing connection to PostgreSQL...');
      pool = new Pool({
        connectionString: dbUrl,
        connectionTimeoutMillis: 2000, // Fail fast (2s)
        ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
      });
      await pool.query('SELECT 1');
      console.log('Successfully connected to PostgreSQL.');
      isSQLite = false;
    } catch (err) {
      console.warn('PostgreSQL connection failed. Falling back to SQLite automatically. Error:', err.message);
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }
      setupSqlite();
    }
  } else {
    console.log('PostgreSQL database URL not configured or SQLite forced. Using SQLite.');
    setupSqlite();
  }

  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql file not found at:', schemaPath);
    return;
  }

  let schemaSql = fs.readFileSync(schemaPath, 'utf8');

  if (isSQLite) {
    console.log('Initializing SQLite schema...');
    schemaSql = schemaSql
      .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/CREATE TABLE IF NOT EXISTS/gi, 'CREATE TABLE IF NOT EXISTS')
      .replace(/REFERENCES stations\(id\) ON DELETE CASCADE/gi, 'REFERENCES stations(id) ON DELETE CASCADE')
      .replace(/REFERENCES observations\(id\) ON DELETE CASCADE/gi, 'REFERENCES observations(id) ON DELETE CASCADE')
      .replace(/REFERENCES issue_categories\(id\) ON DELETE CASCADE/gi, 'REFERENCES issue_categories(id) ON DELETE CASCADE')
      .replace(/REFERENCES users\(id\) ON DELETE SET NULL/gi, 'REFERENCES users(id) ON DELETE SET NULL');

    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const stmt of statements) {
      await new Promise((resolve, reject) => {
        sqliteDb.run(stmt, (err) => {
          if (err) {
            console.error('SQLite schema init statement failed:', stmt.slice(0, 50), err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    console.log('SQLite tables initialized successfully.');
  } else {
    console.log('Initializing PostgreSQL schema...');
    await pool.query(schemaSql);
    console.log('PostgreSQL tables initialized successfully.');
  }
}


module.exports = {
  query,
  initDb,
  isSQLite: () => isSQLite
};
