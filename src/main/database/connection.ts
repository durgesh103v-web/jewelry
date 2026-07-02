import { app } from 'electron'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let db: Database.Database | null = null

function runMigrations(database: Database.Database): void {
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS account_groups (
      id TEXT PRIMARY KEY,
      group_name TEXT NOT NULL,
      group_type TEXT NOT NULL,
      description TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_account_groups_name_not_deleted
    ON account_groups(group_name)
    WHERE deleted_at IS NULL;
  `)
}

export function getDatabase(): Database.Database {
  if (db) return db

  const dataDir = join(app.getPath('userData'), 'data')

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  const dbPath = join(dataDir, 'jewellery-erp.db')

  db = new Database(dbPath)
  runMigrations(db)

  return db
}
