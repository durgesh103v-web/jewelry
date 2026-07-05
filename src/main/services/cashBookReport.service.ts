import { getDatabase } from '../database/connection'
import type {
  CashBookReportFilter,
  CashBookReportResult,
  CashBookReportRow
} from '../../shared/types/cashBookReport'

type CashBookLedgerRow = {
  id: string
  entry_date: string
  source_type: string
  source_id: string
  cash_jama: number
  cash_nave: number
  narration: string | null
  created_at: string
  account_name: string | null
  sale_no: string | null
  purchase_no: string | null
  voucher_no: string | null
  voucher_type: 'RECEIPT' | 'PAYMENT' | null
}

const allowedSources = ['SALE_PAYMENT', 'PURCHASE_PAYMENT', 'CASH_RECEIPT', 'CASH_PAYMENT']

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getSourceLabel(sourceType: string): string {
  if (sourceType === 'SALE_PAYMENT') return 'Sale Receipt'
  if (sourceType === 'PURCHASE_PAYMENT') return 'Purchase Payment'
  if (sourceType === 'CASH_RECEIPT') return 'Cash Receipt'
  if (sourceType === 'CASH_PAYMENT') return 'Cash Payment'
  return sourceType
}

function getDisplayVoucherNo(row: CashBookLedgerRow): string {
  return row.voucher_no || row.sale_no || row.purchase_no || '-'
}

export function getCashBookReport(filter: CashBookReportFilter = {}): CashBookReportResult {
  const db = getDatabase()
  const fromDate = filter.fromDate || getTodayDate()
  const toDate = filter.toDate || getTodayDate()
  const sourcePlaceholders = allowedSources.map(() => '?').join(', ')

  const openingRow = db
    .prepare(
      `
      SELECT
        COALESCE(SUM(cash_jama - cash_nave), 0) AS opening_balance
      FROM account_ledger
      WHERE entry_date < ?
        AND source_type IN (${sourcePlaceholders})
        AND (cash_jama != 0 OR cash_nave != 0)
    `
    )
    .get(fromDate, ...allowedSources) as { opening_balance: number } | undefined

  const openingBalance = Number(openingRow?.opening_balance || 0)

  const ledgerRows = db
    .prepare(
      `
      SELECT
        al.id,
        al.entry_date,
        al.source_type,
        al.source_id,
        al.cash_jama,
        al.cash_nave,
        al.narration,
        al.created_at,
        a.account_name,
        sh.sale_no,
        ph.purchase_no,
        cv.voucher_no,
        cv.voucher_type
      FROM account_ledger al
      LEFT JOIN accounts a ON a.id = al.account_id
      LEFT JOIN sale_headers sh ON sh.id = al.source_id AND al.source_type = 'SALE_PAYMENT'
      LEFT JOIN purchase_headers ph ON ph.id = al.source_id AND al.source_type = 'PURCHASE_PAYMENT'
      LEFT JOIN cash_vouchers cv ON cv.id = al.source_id AND al.source_type IN ('CASH_RECEIPT', 'CASH_PAYMENT')
      WHERE al.entry_date >= ?
        AND al.entry_date <= ?
        AND al.source_type IN (${sourcePlaceholders})
        AND (al.cash_jama != 0 OR al.cash_nave != 0)
      ORDER BY al.entry_date ASC, al.created_at ASC, al.id ASC
    `
    )
    .all(fromDate, toDate, ...allowedSources) as CashBookLedgerRow[]

  let runningBalance = openingBalance
  let totalReceipt = 0
  let totalPayment = 0

  const rows: CashBookReportRow[] = ledgerRows.map((row) => {
    const receiptAmount = Number(row.cash_jama || 0)
    const paymentAmount = Number(row.cash_nave || 0)

    runningBalance = runningBalance + receiptAmount - paymentAmount
    totalReceipt += receiptAmount
    totalPayment += paymentAmount

    return {
      id: row.id,
      voucherDate: row.entry_date,
      voucherNo: getDisplayVoucherNo(row),
      voucherType: receiptAmount > 0 ? 'RECEIPT' : 'PAYMENT',
      sourceType: row.source_type,
      sourceLabel: getSourceLabel(row.source_type),
      accountName: row.account_name || '',
      narration: row.narration || '',
      receiptAmount,
      paymentAmount,
      runningBalance
    }
  })

  return {
    rows,
    summary: {
      openingBalance,
      totalReceipt,
      totalPayment,
      closingBalance: openingBalance + totalReceipt - totalPayment
    }
  }
}
