import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const persistentDir = process.env.PERSISTENT_DIR || process.cwd();
export const dataDir = path.join(persistentDir, 'data');
export const uploadsDir = path.join(persistentDir, 'uploads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const DB_PATH = path.join(dataDir, 'paso.db');

declare global {
  var _pasoDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!global._pasoDb) {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        instagram TEXT,
        ticket_type TEXT NOT NULL,
        ticket_count INTEGER NOT NULL DEFAULT 1,
        people_count INTEGER NOT NULL DEFAULT 1,
        amount_due REAL NOT NULL,
        payment_proof_filename TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        ticket_code TEXT UNIQUE,
        notes TEXT,
        checked_in INTEGER NOT NULL DEFAULT 0,
        checked_in_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migrate: add guest_names column if not present
    try { db.exec(`ALTER TABLE orders ADD COLUMN guest_names TEXT`); } catch (_) {}

    global._pasoDb = db;
  }
  return global._pasoDb;
}
