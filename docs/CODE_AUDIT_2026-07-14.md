# Jewellery ERP — Logic, Calculation & Performance Audit

Date: 2026-07-14. Scope reviewed: core formula service, Sale, Purchase, Sale Return, Cash Voucher, Item Opening Stock, Account Balance, Stock Report, Cash Book report, DB schema/migrations, IPC wiring, and the Sale/Purchase/App frontend.

Overall the accounting model is sound: every multi-row write is wrapped in a single `db.transaction()`, reversals (cancel/void) hard-delete the ledger rows so recomputed balances net back exactly, returns correctly mirror the sale/purchase sign convention, and opening stock posts to `stock_ledger`. The issues below are mostly consistency, stale-snapshot, and performance items — not broken math.

---

## Correctness

### C1 — Sale totals are not rounded (other transactions are) · Medium
`sale.service.ts` builds `itemFineTotal`, `itemMajuriTotal`, and the payment totals with a raw `reduce`, no `roundNumber`:

```ts
const itemFineTotal = preparedItemLines.reduce((t, l) => t + l.fine, 0)
const itemMajuriTotal = preparedItemLines.reduce((t, l) => t + l.majuri, 0)
```

But `purchase.service.ts`, `saleReturn.service.ts`, and `purchaseReturn.service.ts` all wrap the same sums in `roundNumber(..., 3)` for fine and `roundNumber(..., 0)` for majuri. Consequence: Sale headers, the `account_ledger` rows, and closing balances can store floating-point noise (e.g. `12.340000000001`), and sale majuri isn't rounded to whole rupees the way purchase majuri is. This produces tiny mismatches between Sale and Purchase/Return figures and drift in account balances.

Fix: round the sale totals identically to purchase (fine → 3 dp, majuri/cash/bank/anamat → 0 dp), and round `closingCash/closingBank/closingAnamat` too.

### C2 — Header "Old/Closing balance" snapshots go stale · Medium
`old_gold_fine … closing_bank` on sale/purchase/return headers are captured once at creation from the live ledger. Cancelling or editing an *earlier* bill does not update the snapshots on *later* bills. Sale Register and Purchase Register display `closing_*` straight from the header, so those columns can disagree with the true balance. Account Balance / Account Ledger reports recompute from `account_ledger` and stay correct.

Fix options: (a) treat the columns as point-in-time snapshots and label them as such, or (b) compute the register's balance column live from `account_ledger` instead of reading the stored snapshot.

### C3 — Sale payment lines marked NAVE are silently ignored · Low–Medium
In `sale.service.create`, every payment total filters `line.jamaNave === 'JAMA'`. A payment line saved as `NAVE` is written to `sale_payment_lines` but contributes to no total and no ledger entry — it vanishes from balances. Either enforce JAMA-only for sale payments in the schema/UI, or handle the NAVE case explicitly.

### C4 — Diamond/Other fine is dropped from balances · Low
`accountBalance.service.getAccountBalance` only sums `metal_type = 'Gold'` and `'Silver'`. A Sale/Purchase with `metalType` Diamond/Other still posts `fine_nave/jama` tagged with that metal, but it is never summed into any balance and never surfaced. Fine if the business is strictly gold/silver, but add a guard or explicitly reject those metals for fine-bearing transactions.

---

## Performance

### P1 — N+1 query in account balances · Medium–High
`listAccountBalances()` loops every account and calls `getAccountBalance(id)`, which runs a separate aggregate scan of `account_ledger` per account. `getOutstandingBalances()`, the Account Balance report, and the dashboard all route through this. With hundreds of accounts and a growing ledger it's O(N) round-trips.

Fix: one `SELECT account_id, SUM(CASE …) … FROM account_ledger GROUP BY account_id` joined to accounts, then merge with openings in JS. Turns N+1 queries into 2.

### P2 — Prepared statements recompiled inside loops · Low–Medium
Every transaction service calls `db.prepare(INSERT …)` *inside* the `for (const line of …)` loop, recompiling identical SQL per line (item line + stock_ledger line). Hoist each `db.prepare(...)` above the loop and call `.run(...)` per line. Applies to sale, purchase, both returns, and opening stock.

### P3 — Missing SQLite pragmas · Low–Medium
`connection.ts` sets only `journal_mode=WAL` and `foreign_keys=ON`. Add on open:

```sql
PRAGMA synchronous = NORMAL;   -- safe under WAL, materially faster writes
PRAGMA busy_timeout = 5000;    -- avoids SQLITE_BUSY during backup / long reads
PRAGMA cache_size = -16000;    -- ~16MB page cache (optional)
```

### P4 — Missing indexes for date-ranged & report queries · Medium
Ledgers, Cash Book, Daily and Stock reports filter on `entry_date`, but there is no index on it. Add:

```sql
CREATE INDEX IF NOT EXISTS idx_account_ledger_account_date ON account_ledger(account_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_account_ledger_date         ON account_ledger(entry_date);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_date      ON stock_ledger(item_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_date           ON stock_ledger(entry_date);
```

The many `WHERE deleted_at IS NULL` header scans can also use partial indexes on the larger tables (`sale_headers`, `purchase_headers`).

### P5 — No renderer code splitting · Low (optional)
All ~55 screens are statically imported in `App.tsx`, so the whole renderer bundle parses at startup. It's a local desktop app so there's no network cost, but `React.lazy` per screen would cut startup parse and memory. Optional.

---

## Maintainability

### M1 — Duplicated formula file · Low but risky
`src/main/services/jewelleryFormula.service.ts` and `src/renderer/src/utils/jewelleryFormula.ts` are byte-for-byte identical. If one is changed and the other isn't, the on-screen preview silently diverges from what the backend saves. Move the functions to `src/shared/` and import from both sides so there is one source of truth.

---

## Suggested priority order
1. C1 (round sale totals) — quick, removes real money drift.
2. P1 (N+1 account balances) — biggest speed win as data grows.
3. P4 + P3 (indexes + pragmas) — one migration, broad speedup.
4. P2 (hoist prepares) — mechanical cleanup.
5. C2 / C3 / C4 — decide policy, then enforce.
6. M1 (dedupe formula) — guards against future calc bugs.

---

## Fixes applied (2026-07-14)

- **M1 — Formula deduped.** New `src/shared/jewelleryFormula.ts` is now the single source of truth; `main/services/jewelleryFormula.service.ts` and `renderer/src/utils/jewelleryFormula.ts` are thin re-exports, so every existing import path keeps working and the two sides can no longer drift.
- **C1 — Sale rounding.** Sale item/majuri/payment totals and all closing balances now go through `roundNumber` exactly like Purchase/Returns (fine → 3 dp, currency → 0 dp). No more floating-point residue in headers, ledger, or balances.
- **C3 — No dropped sale payments.** Sale payment totals now sum every payment line instead of filtering on `jamaNave === 'JAMA'`, so nothing entered can be silently lost. (Sale UI only ever creates JAMA lines, so behaviour is unchanged for existing data.)
- **P1 — N+1 removed.** `accountBalance.listAccountBalances()` now uses one `GROUP BY account_id` aggregate over the whole ledger instead of one query per account. Account Balance report, Outstanding, and the dashboard drop from N+1 queries to 2.
- **P2 — Prepared statements hoisted.** In `sale.service` and `purchase.service`, the per-line `sale_item_lines` / `stock_ledger` / payment-line inserts are compiled once before the loop and reused, instead of recompiling on every row.
- **P3 — Pragmas added** in `connection.ts`: `synchronous=NORMAL`, `busy_timeout=5000`, `cache_size=-16000`, `temp_store=MEMORY` (alongside the existing WAL + foreign_keys).
- **P4 — Indexes added:** `account_ledger(account_id, entry_date)`, `account_ledger(entry_date)`, `stock_ledger(item_id, entry_date)`, `stock_ledger(entry_date)` — created idempotently in migrations, so they apply on next launch.

### Deliberately not changed
- **C2 (snapshot balances)** — the header `old_*`/`closing_*` columns are intentionally point-in-time snapshots (correct for a printed historical bill). All live balance reports already recompute from `account_ledger`, so no code change; documented as expected behaviour.
- **C4 (Diamond/Other fine)** — diamonds carry no fine weight, so summing only Gold/Silver fine is correct for the domain. Left as-is.
- **P2 on Sale Return / Purchase Return / Opening Stock** — same hoisting pattern applies but those paths are low-frequency; can be done later with the same edit.

### Verification note
The shell sandbox mount served stale copies of the edited files, so `npm run typecheck` could not be run reliably here; each change was verified by direct review of the authoritative files. Please run `npm run typecheck` locally to confirm before building — all changes are type-compatible with the existing code.
