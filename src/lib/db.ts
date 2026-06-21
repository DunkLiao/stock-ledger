import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "stock_booking.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO config (key, value) VALUES ('settlement_balance', '0');
    INSERT OR IGNORE INTO config (key, value) VALUES ('fee_discount', '0.35');

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      stock_code TEXT NOT NULL,
      stock_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      note TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_stock_code ON transactions(stock_code);

    CREATE TABLE IF NOT EXISTS price_cache (
      stock_code TEXT PRIMARY KEY,
      current_price REAL NOT NULL,
      previous_close REAL,
      change_percent REAL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_dividends (
      stock_code TEXT PRIMARY KEY,
      total_dividend REAL NOT NULL DEFAULT 0
    );
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
