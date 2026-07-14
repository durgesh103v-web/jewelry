import { getDatabase } from '../database/connection'
import type {
  DarRojmelFilter,
  DarRojmelResult,
  DarRojmelRow
} from '../../shared/types/darRojmelReport'

type SaleRow = {
  id: string
  entryDate: string
  billNo: string
  accountName: string
  metalType: string
  fine: number
}

type PurchaseRow = {
  id: string
  entryDate: string
  billNo: string
  accountName: string
  metalType: string
  fine: number
}

type SaudaRow = {
  id: string
  entryDate: string
  billNo: string
  accountName: string
  metalType: string
  fine: number
  rate: number
  amount: number
}

function buildDateFilter(
  column: string,
  filter: DarRojmelFilter
): { clause: string; params: string[] } {
  const params: string[] = []
  let clause = ''

  if (filter.fromDate) {
    clause += ` AND ${column} >= ?`
    params.push(filter.fromDate)
  }

  if (filter.toDate) {
    clause += ` AND ${column} <= ?`
    params.push(filter.toDate)
  }

  return { clause, params }
}

/**
 * Dar Rojmel — a day-wise rate register of all rate-based dealings.
 *
 * IMPORTANT DATA-MODEL NOTE: sale_item_lines / purchase_item_lines do not carry a per-line
 * "rate" column anywhere in this schema — only sale_payment_lines / purchase_payment_lines have
 * a `rate` field, and that is the fine-to-cash conversion rate used on the payment/settlement
 * side of a bill, not a per-item trading rate. sauda_entries is the only table in the schema
 * that stores a genuine trading rate (rate per unit fine) alongside its resulting amount.
 *
 * Because of this, Dar Rojmel here is built as: Sauda Book entries contribute rate + amount
 * (both real, rate * fine = amount as saved at entry time), while Sale and Purchase bills
 * contribute date / account / metal / fine only — their `rate` and `amount` fields are returned
 * as null and rendered as "-" in the UI, with a note explaining why. This keeps the report
 * honest about what data actually exists instead of fabricating a rate.
 */
export function getDarRojmelReport(filter: DarRojmelFilter = {}): DarRojmelResult {
  const db = getDatabase()

  const saleDateFilter = buildDateFilter('sh.sale_date', filter)
  const purchaseDateFilter = buildDateFilter('ph.purchase_date', filter)
  const saudaDateFilter = buildDateFilter('se.sauda_date', filter)

  const saleRows = db
    .prepare(
      `
      SELECT
        sh.id AS id,
        sh.sale_date AS entryDate,
        sh.sale_no AS billNo,
        a.account_name AS accountName,
        sh.metal_type AS metalType,
        sh.item_fine_total AS fine
      FROM sale_headers sh
      INNER JOIN accounts a ON a.id = sh.account_id
      WHERE sh.deleted_at IS NULL${saleDateFilter.clause}
      ORDER BY sh.sale_date ASC, sh.created_at ASC
    `
    )
    .all(...saleDateFilter.params) as SaleRow[]

  const purchaseRows = db
    .prepare(
      `
      SELECT
        ph.id AS id,
        ph.purchase_date AS entryDate,
        ph.purchase_no AS billNo,
        a.account_name AS accountName,
        ph.metal_type AS metalType,
        ph.item_fine_total AS fine
      FROM purchase_headers ph
      INNER JOIN accounts a ON a.id = ph.account_id
      WHERE ph.deleted_at IS NULL${purchaseDateFilter.clause}
      ORDER BY ph.purchase_date ASC, ph.created_at ASC
    `
    )
    .all(...purchaseDateFilter.params) as PurchaseRow[]

  const saudaRows = db
    .prepare(
      `
      SELECT
        se.id AS id,
        se.sauda_date AS entryDate,
        se.sauda_no AS billNo,
        a.account_name AS accountName,
        se.metal_type AS metalType,
        se.fine AS fine,
        se.rate AS rate,
        se.amount AS amount
      FROM sauda_entries se
      INNER JOIN accounts a ON a.id = se.account_id
      WHERE se.deleted_at IS NULL${saudaDateFilter.clause}
      ORDER BY se.sauda_date ASC, se.created_at ASC
    `
    )
    .all(...saudaDateFilter.params) as SaudaRow[]

  const rows: DarRojmelRow[] = [
    ...saleRows.map((row) => ({
      id: row.id,
      entryDate: row.entryDate,
      transactionType: 'SALE' as const,
      billNo: row.billNo,
      accountName: row.accountName,
      metalType: row.metalType,
      fine: Number(row.fine || 0),
      rate: null,
      amount: null
    })),
    ...purchaseRows.map((row) => ({
      id: row.id,
      entryDate: row.entryDate,
      transactionType: 'PURCHASE' as const,
      billNo: row.billNo,
      accountName: row.accountName,
      metalType: row.metalType,
      fine: Number(row.fine || 0),
      rate: null,
      amount: null
    })),
    ...saudaRows.map((row) => ({
      id: row.id,
      entryDate: row.entryDate,
      transactionType: 'SAUDA' as const,
      billNo: row.billNo,
      accountName: row.accountName,
      metalType: row.metalType,
      fine: Number(row.fine || 0),
      rate: Number(row.rate || 0),
      amount: Number(row.amount || 0)
    }))
  ].sort((a, b) => {
    if (a.entryDate === b.entryDate) {
      return a.transactionType.localeCompare(b.transactionType)
    }
    return a.entryDate.localeCompare(b.entryDate)
  })

  const summary = rows.reduce(
    (total, row) => {
      total.totalFine += row.fine
      total.totalAmount += row.amount || 0
      total.saudaCount += row.transactionType === 'SAUDA' ? 1 : 0
      total.recordCount += 1
      return total
    },
    { totalFine: 0, totalAmount: 0, saudaCount: 0, recordCount: 0 }
  )

  return { rows, summary }
}
