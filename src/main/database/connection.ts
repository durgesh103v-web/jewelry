import { app } from 'electron'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let db: Database.Database | null = null

function addColumnIfMissing(
  database: Database.Database,
  tableName: string,
  columnName: string,
  columnDefinition: string
): void {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[]
  const exists = columns.some((column) => column.name === columnName)

  if (!exists) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`)
  }
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA cache_size = -16000;
    PRAGMA temp_store = MEMORY;

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
      address TEXT DEFAULT '',
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
      unit TEXT DEFAULT 'Kg',
      fine REAL NOT NULL DEFAULT 0,
      majuri_rate REAL NOT NULL DEFAULT 0,
      majuri REAL NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS sale_headers (
      id TEXT PRIMARY KEY,
      sale_no TEXT NOT NULL UNIQUE,
      sale_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      phone TEXT DEFAULT '',
      metal_type TEXT NOT NULL,
      haste TEXT DEFAULT '',
      dp_no TEXT DEFAULT '',
      narration TEXT DEFAULT '',
      reminder_date TEXT DEFAULT '',
      old_gold_fine REAL NOT NULL DEFAULT 0,
      old_silver_fine REAL NOT NULL DEFAULT 0,
      old_cash REAL NOT NULL DEFAULT 0,
      old_anamat REAL NOT NULL DEFAULT 0,
      old_bank REAL NOT NULL DEFAULT 0,
      item_fine_total REAL NOT NULL DEFAULT 0,
      item_majuri_total REAL NOT NULL DEFAULT 0,
      payment_fine_jama_total REAL NOT NULL DEFAULT 0,
      payment_cash_jama_total REAL NOT NULL DEFAULT 0,
      payment_bank_jama_total REAL NOT NULL DEFAULT 0,
      payment_anamat_jama_total REAL NOT NULL DEFAULT 0,
      closing_gold_fine REAL NOT NULL DEFAULT 0,
      closing_silver_fine REAL NOT NULL DEFAULT 0,
      closing_cash REAL NOT NULL DEFAULT 0,
      closing_anamat REAL NOT NULL DEFAULT 0,
      closing_bank REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS sale_item_lines (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      line_no INTEGER NOT NULL,
      line_type TEXT NOT NULL DEFAULT 'NAVE',
      item_id TEXT NOT NULL,
      stamp_id TEXT,
      design_id TEXT,
      item_name_snapshot TEXT NOT NULL,
      barcode TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      pcs REAL NOT NULL DEFAULT 0,
      gross_weight REAL NOT NULL DEFAULT 0,
      pack_weight REAL NOT NULL DEFAULT 0,
      less_weight REAL NOT NULL DEFAULT 0,
      add_weight REAL NOT NULL DEFAULT 0,
      net_weight REAL NOT NULL DEFAULT 0,
      tunch REAL NOT NULL DEFAULT 0,
      wastage REAL NOT NULL DEFAULT 0,
      hishob REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'GM',
      labour_rate REAL NOT NULL DEFAULT 0,
      labour_rate_type TEXT NOT NULL DEFAULT 'Kg',
      fine REAL NOT NULL DEFAULT 0,
      majuri REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sale_headers(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (stamp_id) REFERENCES item_stamps(id),
      FOREIGN KEY (design_id) REFERENCES item_designs(id)
    );

    CREATE TABLE IF NOT EXISTS sale_payment_lines (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      line_no INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT '',
      jama_nave TEXT NOT NULL DEFAULT 'JAMA',
      details TEXT DEFAULT '',
      pcs REAL NOT NULL DEFAULT 0,
      weight REAL NOT NULL DEFAULT 0,
      tanch REAL NOT NULL DEFAULT 0,
      wastage REAL NOT NULL DEFAULT 0,
      hishob REAL NOT NULL DEFAULT 0,
      fine REAL NOT NULL DEFAULT 0,
      rate REAL NOT NULL DEFAULT 0,
      fine_amount REAL NOT NULL DEFAULT 0,
      anamat REAL NOT NULL DEFAULT 0,
      cash REAL NOT NULL DEFAULT 0,
      bank REAL NOT NULL DEFAULT 0,
      account_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sale_headers(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS account_ledger (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_line_id TEXT,
      entry_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      metal_type TEXT DEFAULT '',
      fine_jama REAL NOT NULL DEFAULT 0,
      fine_nave REAL NOT NULL DEFAULT 0,
      cash_jama REAL NOT NULL DEFAULT 0,
      cash_nave REAL NOT NULL DEFAULT 0,
      bank_jama REAL NOT NULL DEFAULT 0,
      bank_nave REAL NOT NULL DEFAULT 0,
      anamat_jama REAL NOT NULL DEFAULT 0,
      anamat_nave REAL NOT NULL DEFAULT 0,
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sale_headers_account
    ON sale_headers(account_id);

    CREATE INDEX IF NOT EXISTS idx_sale_headers_date
    ON sale_headers(sale_date);

    CREATE INDEX IF NOT EXISTS idx_sale_item_lines_sale
    ON sale_item_lines(sale_id);

    CREATE INDEX IF NOT EXISTS idx_sale_payment_lines_sale
    ON sale_payment_lines(sale_id);

    CREATE INDEX IF NOT EXISTS idx_account_ledger_account
    ON account_ledger(account_id);

    CREATE INDEX IF NOT EXISTS idx_account_ledger_source
    ON account_ledger(source_type, source_id);

    -- Date-ranged report queries (Account Ledger, Cash Book, Daily, Outstanding)
    -- filter/scan by entry_date, usually scoped to an account. These indexes let
    -- SQLite seek instead of scanning the whole ledger.
    CREATE INDEX IF NOT EXISTS idx_account_ledger_account_date
    ON account_ledger(account_id, entry_date);

    CREATE INDEX IF NOT EXISTS idx_account_ledger_date
    ON account_ledger(entry_date);

    CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_date
    ON stock_ledger(item_id, entry_date);

    CREATE INDEX IF NOT EXISTS idx_stock_ledger_date
    ON stock_ledger(entry_date);
  `)
  database.exec(`
    CREATE TABLE IF NOT EXISTS purchase_headers (
      id TEXT PRIMARY KEY,
      purchase_no TEXT NOT NULL UNIQUE,
      purchase_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      phone TEXT DEFAULT '',
      metal_type TEXT NOT NULL,
      haste TEXT DEFAULT '',
      dp_no TEXT DEFAULT '',
      narration TEXT DEFAULT '',
      reminder_date TEXT DEFAULT '',
      old_gold_fine REAL NOT NULL DEFAULT 0,
      old_silver_fine REAL NOT NULL DEFAULT 0,
      old_cash REAL NOT NULL DEFAULT 0,
      old_anamat REAL NOT NULL DEFAULT 0,
      old_bank REAL NOT NULL DEFAULT 0,
      item_fine_total REAL NOT NULL DEFAULT 0,
      item_majuri_total REAL NOT NULL DEFAULT 0,
      payment_fine_nave_total REAL NOT NULL DEFAULT 0,
      payment_cash_nave_total REAL NOT NULL DEFAULT 0,
      payment_bank_nave_total REAL NOT NULL DEFAULT 0,
      payment_anamat_nave_total REAL NOT NULL DEFAULT 0,
      closing_gold_fine REAL NOT NULL DEFAULT 0,
      closing_silver_fine REAL NOT NULL DEFAULT 0,
      closing_cash REAL NOT NULL DEFAULT 0,
      closing_anamat REAL NOT NULL DEFAULT 0,
      closing_bank REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_item_lines (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL,
      line_no INTEGER NOT NULL,
      line_type TEXT NOT NULL DEFAULT 'JAMA',
      item_id TEXT NOT NULL,
      stamp_id TEXT,
      design_id TEXT,
      item_name_snapshot TEXT NOT NULL,
      barcode TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      pcs REAL NOT NULL DEFAULT 0,
      gross_weight REAL NOT NULL DEFAULT 0,
      pack_weight REAL NOT NULL DEFAULT 0,
      less_weight REAL NOT NULL DEFAULT 0,
      add_weight REAL NOT NULL DEFAULT 0,
      net_weight REAL NOT NULL DEFAULT 0,
      tunch REAL NOT NULL DEFAULT 0,
      wastage REAL NOT NULL DEFAULT 0,
      hishob REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'GM',
      labour_rate REAL NOT NULL DEFAULT 0,
      labour_rate_type TEXT NOT NULL DEFAULT 'Kg',
      fine REAL NOT NULL DEFAULT 0,
      majuri REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchase_headers(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (stamp_id) REFERENCES item_stamps(id),
      FOREIGN KEY (design_id) REFERENCES item_designs(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_payment_lines (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL,
      line_no INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT '',
      jama_nave TEXT NOT NULL DEFAULT 'NAVE',
      details TEXT DEFAULT '',
      pcs REAL NOT NULL DEFAULT 0,
      weight REAL NOT NULL DEFAULT 0,
      tanch REAL NOT NULL DEFAULT 0,
      wastage REAL NOT NULL DEFAULT 0,
      hishob REAL NOT NULL DEFAULT 0,
      fine REAL NOT NULL DEFAULT 0,
      rate REAL NOT NULL DEFAULT 0,
      fine_amount REAL NOT NULL DEFAULT 0,
      anamat REAL NOT NULL DEFAULT 0,
      cash REAL NOT NULL DEFAULT 0,
      bank REAL NOT NULL DEFAULT 0,
      account_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchase_headers(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_headers_account
    ON purchase_headers(account_id);

    CREATE INDEX IF NOT EXISTS idx_purchase_headers_date
    ON purchase_headers(purchase_date);

    CREATE INDEX IF NOT EXISTS idx_purchase_item_lines_purchase
    ON purchase_item_lines(purchase_id);

    CREATE INDEX IF NOT EXISTS idx_purchase_payment_lines_purchase
    ON purchase_payment_lines(purchase_id);
  `)
  database.exec(`
    CREATE TABLE IF NOT EXISTS firm_settings (
      id TEXT PRIMARY KEY,
      firm_name TEXT NOT NULL DEFAULT '',
      owner_name TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      mobile_number TEXT DEFAULT '',
      whatsapp_number TEXT DEFAULT '',
      email TEXT DEFAULT '',
      gst_no TEXT DEFAULT '',
      pan_no TEXT DEFAULT '',
      bill_title TEXT DEFAULT 'SALE BILL',
      bill_prefix TEXT DEFAULT 'SL',
      terms TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `)
  database.exec(`
    CREATE TABLE IF NOT EXISTS printer_settings (
      id TEXT PRIMARY KEY,
      paper_size TEXT NOT NULL DEFAULT 'A4',
      print_layout TEXT NOT NULL DEFAULT 'STANDARD',
      print_copies INTEGER NOT NULL DEFAULT 1,
      margin_top_mm REAL NOT NULL DEFAULT 10,
      margin_right_mm REAL NOT NULL DEFAULT 10,
      margin_bottom_mm REAL NOT NULL DEFAULT 10,
      margin_left_mm REAL NOT NULL DEFAULT 10,
      show_firm_header INTEGER NOT NULL DEFAULT 1,
      show_gst_pan INTEGER NOT NULL DEFAULT 1,
      show_terms INTEGER NOT NULL DEFAULT 1,
      show_signature INTEGER NOT NULL DEFAULT 1,
      show_payment_section INTEGER NOT NULL DEFAULT 1,
      auto_print_after_save INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS cash_vouchers (
      id TEXT PRIMARY KEY,
      voucher_type TEXT NOT NULL CHECK (voucher_type IN ('RECEIPT', 'PAYMENT')),
      voucher_no TEXT NOT NULL UNIQUE,
      voucher_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_cash_vouchers_account
    ON cash_vouchers(account_id);

    CREATE INDEX IF NOT EXISTS idx_cash_vouchers_date
    ON cash_vouchers(voucher_date);
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS cash_fine_opening_settings (
      id TEXT PRIMARY KEY,
      gold_purchase_fine REAL NOT NULL DEFAULT 0,
      gold_purchase_amount REAL NOT NULL DEFAULT 0,
      gold_sale_fine REAL NOT NULL DEFAULT 0,
      gold_sale_amount REAL NOT NULL DEFAULT 0,
      silver_purchase_fine REAL NOT NULL DEFAULT 0,
      silver_purchase_amount REAL NOT NULL DEFAULT 0,
      silver_sale_fine REAL NOT NULL DEFAULT 0,
      silver_sale_amount REAL NOT NULL DEFAULT 0,
      opening_cash REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_fine_opening_lines (
      id TEXT PRIMARY KEY,
      line_no INTEGER NOT NULL,
      metal_type TEXT NOT NULL,
      entry_type TEXT NOT NULL DEFAULT '',
      details TEXT DEFAULT '',
      weight REAL NOT NULL DEFAULT 0,
      tanch REAL NOT NULL DEFAULT 0,
      fine REAL NOT NULL DEFAULT 0,
      pt_status TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cash_fine_opening_lines_metal
    ON cash_fine_opening_lines(metal_type);
  `)
  addColumnIfMissing(
    database,
    'accounts',
    'account_type',
    "TEXT NOT NULL DEFAULT 'Wholesale Customer'"
  )
  addColumnIfMissing(database, 'accounts', 'last_date', "TEXT DEFAULT ''")
  addColumnIfMissing(database, 'accounts', 'gold_fine_limit', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'accounts', 'silver_fine_limit', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'accounts', 'phone2', "TEXT DEFAULT ''")
  addColumnIfMissing(database, 'accounts', 'address', "TEXT DEFAULT ''")
  addColumnIfMissing(database, 'accounts', 'notification', "TEXT DEFAULT ''")
  addColumnIfMissing(database, 'item_opening_stock', 'majuri_rate', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'item_opening_stock', 'majuri', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'items', 'default_tanch', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'items', 'default_wastage', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'items', 'default_labour_rate', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'items', 'labour_rate_type', "TEXT NOT NULL DEFAULT 'Kg'")
  addColumnIfMissing(database, 'items', 'barcode_value', 'TEXT')

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_items_barcode_value_not_null
    ON items(barcode_value)
    WHERE barcode_value IS NOT NULL;
  `)
  addColumnIfMissing(database, 'sale_headers', 'bill_type', "TEXT NOT NULL DEFAULT 'WHOLESALE'")
  addColumnIfMissing(database, 'sale_headers', 'taxable_amount', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'sale_headers', 'cgst_amount', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'sale_headers', 'sgst_amount', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'sale_headers', 'igst_amount', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'purchase_headers', 'bill_type', "TEXT NOT NULL DEFAULT 'WHOLESALE'")
  addColumnIfMissing(database, 'purchase_headers', 'taxable_amount', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'purchase_headers', 'cgst_amount', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'purchase_headers', 'sgst_amount', 'REAL NOT NULL DEFAULT 0')
  addColumnIfMissing(database, 'purchase_headers', 'igst_amount', 'REAL NOT NULL DEFAULT 0')

  // Delete Sale Bills utility: sale_headers already uses deleted_at as the
  // canonical "voided/excluded from active reports" flag (see saleService.cancel).
  // These two columns only add audit detail (when + why) on top of that flag.
  addColumnIfMissing(database, 'sale_headers', 'voided_at', 'TEXT')
  addColumnIfMissing(database, 'sale_headers', 'void_reason', "TEXT NOT NULL DEFAULT ''")

  database.exec(`
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      transfer_no TEXT NOT NULL UNIQUE,
      transfer_date TEXT NOT NULL,
      from_account_id TEXT NOT NULL,
      to_account_id TEXT NOT NULL,
      metal_type TEXT NOT NULL DEFAULT '',
      gold_fine REAL NOT NULL DEFAULT 0,
      silver_fine REAL NOT NULL DEFAULT 0,
      cash REAL NOT NULL DEFAULT 0,
      bank REAL NOT NULL DEFAULT 0,
      anamat REAL NOT NULL DEFAULT 0,
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (from_account_id) REFERENCES accounts(id),
      FOREIGN KEY (to_account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      settlement_no TEXT NOT NULL UNIQUE,
      settlement_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      metal_type TEXT NOT NULL DEFAULT 'Gold',
      gold_fine REAL NOT NULL DEFAULT 0,
      silver_fine REAL NOT NULL DEFAULT 0,
      cash REAL NOT NULL DEFAULT 0,
      bank REAL NOT NULL DEFAULT 0,
      anamat REAL NOT NULL DEFAULT 0,
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS sauda_entries (
      id TEXT PRIMARY KEY,
      sauda_no TEXT NOT NULL UNIQUE,
      sauda_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      metal_type TEXT NOT NULL DEFAULT 'Gold',
      transaction_type TEXT NOT NULL DEFAULT 'BUY',
      fine REAL NOT NULL DEFAULT 0,
      rate REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      delivery_date TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'OPEN',
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS order_payal (
      id TEXT PRIMARY KEY,
      order_no TEXT NOT NULL UNIQUE,
      order_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      pcs REAL NOT NULL DEFAULT 0,
      weight REAL NOT NULL DEFAULT 0,
      delivery_date TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'PENDING',
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS estimate_headers (
      id TEXT PRIMARY KEY,
      estimate_no TEXT NOT NULL UNIQUE,
      estimate_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      phone TEXT DEFAULT '',
      metal_type TEXT NOT NULL,
      narration TEXT DEFAULT '',
      valid_until TEXT DEFAULT '',
      item_fine_total REAL NOT NULL DEFAULT 0,
      item_majuri_total REAL NOT NULL DEFAULT 0,
      taxable_amount REAL NOT NULL DEFAULT 0,
      cgst_amount REAL NOT NULL DEFAULT 0,
      sgst_amount REAL NOT NULL DEFAULT 0,
      igst_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS estimate_item_lines (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL,
      line_no INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      stamp_id TEXT,
      design_id TEXT,
      item_name_snapshot TEXT NOT NULL,
      barcode TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      pcs REAL NOT NULL DEFAULT 0,
      gross_weight REAL NOT NULL DEFAULT 0,
      net_weight REAL NOT NULL DEFAULT 0,
      tunch REAL NOT NULL DEFAULT 0,
      wastage REAL NOT NULL DEFAULT 0,
      fine REAL NOT NULL DEFAULT 0,
      majuri REAL NOT NULL DEFAULT 0,
      hsn_code TEXT DEFAULT '',
      gst_rate REAL NOT NULL DEFAULT 0,
      taxable_amount REAL NOT NULL DEFAULT 0,
      cgst_amount REAL NOT NULL DEFAULT 0,
      sgst_amount REAL NOT NULL DEFAULT 0,
      igst_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (estimate_id) REFERENCES estimate_headers(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL DEFAULT '',
      full_name TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'USER',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS weight_scan_logs (
      id TEXT PRIMARY KEY,
      scan_date TEXT NOT NULL,
      barcode TEXT DEFAULT '',
      item_id TEXT,
      gross_weight REAL NOT NULL DEFAULT 0,
      net_weight REAL NOT NULL DEFAULT 0,
      fine REAL NOT NULL DEFAULT 0,
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS approval_headers (
      id TEXT PRIMARY KEY,
      approval_no TEXT NOT NULL UNIQUE,
      approval_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      phone TEXT DEFAULT '',
      metal_type TEXT NOT NULL,
      narration TEXT DEFAULT '',
      reminder_date TEXT DEFAULT '',
      item_fine_total REAL NOT NULL DEFAULT 0,
      item_majuri_total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'returned', 'partial_return')),
      converted_sale_id TEXT,
      converted_at TEXT,
      returned_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (converted_sale_id) REFERENCES sale_headers(id)
    );

    CREATE TABLE IF NOT EXISTS approval_item_lines (
      id TEXT PRIMARY KEY,
      approval_id TEXT NOT NULL,
      line_no INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      stamp_id TEXT,
      design_id TEXT,
      item_name_snapshot TEXT NOT NULL,
      barcode TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      pcs REAL NOT NULL DEFAULT 0,
      gross_weight REAL NOT NULL DEFAULT 0,
      pack_weight REAL NOT NULL DEFAULT 0,
      less_weight REAL NOT NULL DEFAULT 0,
      add_weight REAL NOT NULL DEFAULT 0,
      net_weight REAL NOT NULL DEFAULT 0,
      tunch REAL NOT NULL DEFAULT 0,
      wastage REAL NOT NULL DEFAULT 0,
      hishob REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'GM',
      labour_rate REAL NOT NULL DEFAULT 0,
      labour_rate_type TEXT NOT NULL DEFAULT 'Kg',
      fine REAL NOT NULL DEFAULT 0,
      majuri REAL NOT NULL DEFAULT 0,
      return_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (return_status IN ('pending', 'returned')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (approval_id) REFERENCES approval_headers(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (stamp_id) REFERENCES item_stamps(id),
      FOREIGN KEY (design_id) REFERENCES item_designs(id)
    );

    CREATE INDEX IF NOT EXISTS idx_approval_headers_account
    ON approval_headers(account_id);

    CREATE INDEX IF NOT EXISTS idx_approval_headers_date
    ON approval_headers(approval_date);

    CREATE INDEX IF NOT EXISTS idx_approval_headers_status
    ON approval_headers(status);

    CREATE INDEX IF NOT EXISTS idx_approval_item_lines_approval
    ON approval_item_lines(approval_id);
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS purchase_return_headers (
      id TEXT PRIMARY KEY,
      return_no TEXT NOT NULL UNIQUE,
      return_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      phone TEXT DEFAULT '',
      metal_type TEXT NOT NULL,
      against_purchase_id TEXT,
      narration TEXT DEFAULT '',
      old_gold_fine REAL NOT NULL DEFAULT 0,
      old_silver_fine REAL NOT NULL DEFAULT 0,
      old_cash REAL NOT NULL DEFAULT 0,
      old_anamat REAL NOT NULL DEFAULT 0,
      old_bank REAL NOT NULL DEFAULT 0,
      item_fine_total REAL NOT NULL DEFAULT 0,
      item_majuri_total REAL NOT NULL DEFAULT 0,
      closing_gold_fine REAL NOT NULL DEFAULT 0,
      closing_silver_fine REAL NOT NULL DEFAULT 0,
      closing_cash REAL NOT NULL DEFAULT 0,
      closing_anamat REAL NOT NULL DEFAULT 0,
      closing_bank REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (against_purchase_id) REFERENCES purchase_headers(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_return_item_lines (
      id TEXT PRIMARY KEY,
      purchase_return_id TEXT NOT NULL,
      line_no INTEGER NOT NULL,
      line_type TEXT NOT NULL DEFAULT 'NAVE',
      item_id TEXT NOT NULL,
      stamp_id TEXT,
      design_id TEXT,
      item_name_snapshot TEXT NOT NULL,
      barcode TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      pcs REAL NOT NULL DEFAULT 0,
      gross_weight REAL NOT NULL DEFAULT 0,
      pack_weight REAL NOT NULL DEFAULT 0,
      less_weight REAL NOT NULL DEFAULT 0,
      add_weight REAL NOT NULL DEFAULT 0,
      net_weight REAL NOT NULL DEFAULT 0,
      tunch REAL NOT NULL DEFAULT 0,
      wastage REAL NOT NULL DEFAULT 0,
      hishob REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'GM',
      labour_rate REAL NOT NULL DEFAULT 0,
      labour_rate_type TEXT NOT NULL DEFAULT 'Kg',
      fine REAL NOT NULL DEFAULT 0,
      majuri REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (purchase_return_id) REFERENCES purchase_return_headers(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (stamp_id) REFERENCES item_stamps(id),
      FOREIGN KEY (design_id) REFERENCES item_designs(id)
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_return_headers_account
    ON purchase_return_headers(account_id);

    CREATE INDEX IF NOT EXISTS idx_purchase_return_headers_date
    ON purchase_return_headers(return_date);

    CREATE INDEX IF NOT EXISTS idx_purchase_return_headers_against_purchase
    ON purchase_return_headers(against_purchase_id);

    CREATE INDEX IF NOT EXISTS idx_purchase_return_item_lines_return
    ON purchase_return_item_lines(purchase_return_id);
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS sale_return_headers (
      id TEXT PRIMARY KEY,
      return_no TEXT NOT NULL UNIQUE,
      return_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      phone TEXT DEFAULT '',
      metal_type TEXT NOT NULL,
      against_sale_id TEXT,
      narration TEXT DEFAULT '',
      old_gold_fine REAL NOT NULL DEFAULT 0,
      old_silver_fine REAL NOT NULL DEFAULT 0,
      old_cash REAL NOT NULL DEFAULT 0,
      old_anamat REAL NOT NULL DEFAULT 0,
      old_bank REAL NOT NULL DEFAULT 0,
      item_fine_total REAL NOT NULL DEFAULT 0,
      item_majuri_total REAL NOT NULL DEFAULT 0,
      closing_gold_fine REAL NOT NULL DEFAULT 0,
      closing_silver_fine REAL NOT NULL DEFAULT 0,
      closing_cash REAL NOT NULL DEFAULT 0,
      closing_anamat REAL NOT NULL DEFAULT 0,
      closing_bank REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (against_sale_id) REFERENCES sale_headers(id)
    );

    CREATE TABLE IF NOT EXISTS sale_return_item_lines (
      id TEXT PRIMARY KEY,
      sale_return_id TEXT NOT NULL,
      line_no INTEGER NOT NULL,
      line_type TEXT NOT NULL DEFAULT 'JAMA',
      item_id TEXT NOT NULL,
      stamp_id TEXT,
      design_id TEXT,
      item_name_snapshot TEXT NOT NULL,
      barcode TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      pcs REAL NOT NULL DEFAULT 0,
      gross_weight REAL NOT NULL DEFAULT 0,
      pack_weight REAL NOT NULL DEFAULT 0,
      less_weight REAL NOT NULL DEFAULT 0,
      add_weight REAL NOT NULL DEFAULT 0,
      net_weight REAL NOT NULL DEFAULT 0,
      tunch REAL NOT NULL DEFAULT 0,
      wastage REAL NOT NULL DEFAULT 0,
      hishob REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'GM',
      labour_rate REAL NOT NULL DEFAULT 0,
      labour_rate_type TEXT NOT NULL DEFAULT 'Kg',
      fine REAL NOT NULL DEFAULT 0,
      majuri REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (sale_return_id) REFERENCES sale_return_headers(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (stamp_id) REFERENCES item_stamps(id),
      FOREIGN KEY (design_id) REFERENCES item_designs(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sale_return_headers_account
    ON sale_return_headers(account_id);

    CREATE INDEX IF NOT EXISTS idx_sale_return_headers_date
    ON sale_return_headers(return_date);

    CREATE INDEX IF NOT EXISTS idx_sale_return_headers_against_sale
    ON sale_return_headers(against_sale_id);

    CREATE INDEX IF NOT EXISTS idx_sale_return_item_lines_return
    ON sale_return_item_lines(sale_return_id);
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS job_work_orders (
      id TEXT PRIMARY KEY,
      order_no TEXT NOT NULL UNIQUE,
      order_date TEXT NOT NULL,
      karigar_account_id TEXT NOT NULL,
      metal_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      gross_weight_given REAL NOT NULL DEFAULT 0,
      net_weight_given REAL NOT NULL DEFAULT 0,
      narration TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'partial_received', 'received', 'cancelled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (karigar_account_id) REFERENCES accounts(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS job_work_receipt_lines (
      id TEXT PRIMARY KEY,
      job_work_order_id TEXT NOT NULL,
      receipt_date TEXT NOT NULL,
      pcs REAL NOT NULL DEFAULT 0,
      gross_weight_received REAL NOT NULL DEFAULT 0,
      net_weight_received REAL NOT NULL DEFAULT 0,
      tunch REAL NOT NULL DEFAULT 0,
      wastage REAL NOT NULL DEFAULT 0,
      hishob REAL NOT NULL DEFAULT 0,
      fine_received REAL NOT NULL DEFAULT 0,
      weight_loss REAL NOT NULL DEFAULT 0,
      labour_rate REAL NOT NULL DEFAULT 0,
      labour_rate_type TEXT NOT NULL DEFAULT 'Kg',
      majuri REAL NOT NULL DEFAULT 0,
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_work_order_id) REFERENCES job_work_orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_job_work_orders_karigar
    ON job_work_orders(karigar_account_id);

    CREATE INDEX IF NOT EXISTS idx_job_work_orders_item
    ON job_work_orders(item_id);

    CREATE INDEX IF NOT EXISTS idx_job_work_orders_status
    ON job_work_orders(status);

    CREATE INDEX IF NOT EXISTS idx_job_work_orders_date
    ON job_work_orders(order_date);

    CREATE INDEX IF NOT EXISTS idx_job_work_receipt_lines_order
    ON job_work_receipt_lines(job_work_order_id);
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS repair_entries (
      id TEXT PRIMARY KEY,
      repair_no TEXT NOT NULL UNIQUE,
      receipt_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      phone TEXT DEFAULT '',
      item_description TEXT NOT NULL DEFAULT '',
      metal_type TEXT NOT NULL,
      approx_weight REAL NOT NULL DEFAULT 0,
      work_description TEXT DEFAULT '',
      estimated_charge REAL NOT NULL DEFAULT 0,
      actual_charge REAL,
      status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'completed', 'delivered', 'cancelled')),
      completed_date TEXT,
      delivered_date TEXT,
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_repair_entries_account
    ON repair_entries(account_id);

    CREATE INDEX IF NOT EXISTS idx_repair_entries_status
    ON repair_entries(status);

    CREATE INDEX IF NOT EXISTS idx_repair_entries_date
    ON repair_entries(receipt_date);
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS financial_years (
      id TEXT PRIMARY KEY,
      year_label TEXT NOT NULL UNIQUE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 0,
      is_closed INTEGER NOT NULL DEFAULT 0,
      narration TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_financial_years_current
    ON financial_years(is_current);
  `)
}

export function getDatabasePath(): string {
  const dataDir = join(app.getPath('userData'), 'data')

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  return join(dataDir, 'jewellery-erp.db')
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDatabasePath()

  db = new Database(dbPath)
  runMigrations(db)

  return db
}

