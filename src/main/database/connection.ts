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

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      account_name TEXT NOT NULL,
      other_name TEXT DEFAULT '',
      account_group_id TEXT NOT NULL,
      mobile_number TEXT DEFAULT '',
      whatsapp_number TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      gst_no TEXT DEFAULT '',
      pan_no TEXT DEFAULT '',
      opening_gold_fine REAL NOT NULL DEFAULT 0,
      opening_silver_fine REAL NOT NULL DEFAULT 0,
      opening_cash REAL NOT NULL DEFAULT 0,
      opening_anamat REAL NOT NULL DEFAULT 0,
      opening_bank REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_group_id) REFERENCES account_groups(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_name_not_deleted
    ON accounts(account_name)
    WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS item_groups (
      id TEXT PRIMARY KEY,
      group_name TEXT NOT NULL,
      metal_type TEXT NOT NULL,
      description TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_item_groups_name_metal_not_deleted
    ON item_groups(group_name, metal_type)
    WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS item_stamps (
      id TEXT PRIMARY KEY,
      stamp_name TEXT NOT NULL,
      metal_type TEXT NOT NULL,
      description TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_item_stamps_name_metal_not_deleted
    ON item_stamps(stamp_name, metal_type)
    WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS item_designs (
      id TEXT PRIMARY KEY,
      design_name TEXT NOT NULL,
      metal_type TEXT NOT NULL,
      description TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_item_designs_name_metal_not_deleted
    ON item_designs(design_name, metal_type)
    WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      metal_type TEXT NOT NULL,
      item_group_id TEXT NOT NULL,
      default_stamp_id TEXT,
      default_design_id TEXT,
      barcode_item INTEGER NOT NULL DEFAULT 0,
      barcode_type TEXT DEFAULT '',
      labour_charges_by TEXT DEFAULT 'Weight',
      sale_purchase_by TEXT DEFAULT 'Weight',
      gst_hsn_code TEXT DEFAULT '',
      fixed_weight_per_pcs REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (item_group_id) REFERENCES item_groups(id),
      FOREIGN KEY (default_stamp_id) REFERENCES item_stamps(id),
      FOREIGN KEY (default_design_id) REFERENCES item_designs(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_items_name_metal_not_deleted
    ON items(item_name, metal_type)
    WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS item_opening_stock (
      id TEXT PRIMARY KEY,
      stock_date TEXT NOT NULL,
      item_id TEXT NOT NULL,
      stamp_id TEXT,
      design_id TEXT,
      barcode TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      pcs REAL NOT NULL DEFAULT 0,
      gross_weight REAL NOT NULL DEFAULT 0,
      less_weight REAL NOT NULL DEFAULT 0,
      add_weight REAL NOT NULL DEFAULT 0,
      net_weight REAL NOT NULL DEFAULT 0,
      tanch REAL NOT NULL DEFAULT 0,
      wastage REAL NOT NULL DEFAULT 0,
      hishob REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'GM',
      fine REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (stamp_id) REFERENCES item_stamps(id),
      FOREIGN KEY (design_id) REFERENCES item_designs(id)
    );

    CREATE TABLE IF NOT EXISTS stock_ledger (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      item_id TEXT NOT NULL,
      stamp_id TEXT,
      design_id TEXT,
      metal_type TEXT NOT NULL,
      pcs_delta REAL NOT NULL DEFAULT 0,
      gross_weight_delta REAL NOT NULL DEFAULT 0,
      net_weight_delta REAL NOT NULL DEFAULT 0,
      fine_delta REAL NOT NULL DEFAULT 0,
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE INDEX IF NOT EXISTS idx_stock_ledger_item
    ON stock_ledger(item_id);

    CREATE INDEX IF NOT EXISTS idx_stock_ledger_source
    ON stock_ledger(source_type, source_id);
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
