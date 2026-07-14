import { getDatabase } from '../database/connection'
import type {
  BankTransactionsReportFilter,
  BankTransactionsReportResult,
  BankTransactionsReportRow
} from '../../shared/types/bankTransactionsReport'

type BankLedgerRow = {
  id: string
  entry_date: string
  source_type: string
  source_id: string
  bank_jama: number
  bank_nave: number
  narration: string | null
  created_at: string
  account_name: string | null
  sale_no: string | null
  purchase_no: string | null
  transfer_no: string | null
  settlement_no: string | null
}

const allowedSources = [
  'SALE_PAYMENT',
  'PURCHASE_PAYMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'SETTLEMENT'
]

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getSourceLabel(sourceType: string): string {
  if (sourceType === 'SALE_PAYMENT') return 'Sale Receipt'
  if (sourceType === 'PURCHASE_PAYMENT') return 'Purchase Payment'
  if (sourceType === 'TRANSFER_IN') return 'Transfer In'
  if (sourceType === 'TRANSFER_OUT') return 'Transfer Out'
  if (sourceType === 'SETTLEMENT') return 'Settlement'
  return sourceType
}

function getDisplayVoucherNo(row: BankLedgerRow): string {
  return row.sale_no || row.purchase_no || row.transfer_no || row.settlement_no || '-'
}

export function getBankTransactionsReport(
  filter: BankTransactionsReportFilter = {}
): BankTransactionsReportResult {
  const db = getDatabase()
  const fromDate = filter.fromDate || getTodayDate()
  const toDate = filter.toDate || getTodayDate()
  const sourcePlaceholders = allowedSources.map(() => '?').join(', ')

  const openingRow = db
    .prepare(
      `
      SELECT
        COALESCE(SUM(bank_jama - bank_nave), 0) AS opening_balance
      FROM account_ledger
      WHERE entry_date < ?
        AND source_type IN (${sourcePlaceholders})
        AND (bank_jama != 0 OR bank_nave != 0)
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
        al.bank_jama,
        al.bank_nave,
        al.narration,
        al.created_at,
        a.account_name,
        sh.sale_no,
        ph.purchase_no,
        tr.transfer_no,
        st.settlement_no
      FROM account_ledger al
      LEFT JOIN accounts a ON a.id = al.account_id
      LEFT JOIN sale_headers sh ON sh.id = al.source_id AND al.source_type = 'SALE_PAYMENT'
      LEFT JOIN purchase_headers ph ON ph.id = al.source_id AND al.source_type = 'PURCHASE_PAYMENT'
      LEFT JOIN transfers tr ON tr.id = al.source_id AND al.source_type IN ('TRANSFER_IN', 'TRANSFER_OUT')
      LEFT JOIN settlements st ON st.id = al.source_id AND al.source_type = 'SETTLEMENT'
      WHERE al.entry_date >= ?
        AND al.entry_date <= ?
        AND al.source_type IN (${sourcePlaceholders})
        AND (al.bank_jama != 0 OR al.bank_nave != 0)
      ORDER BY al.entry_date ASC, al.created_at ASC, al.id ASC
    `
    )
    .all(fromDate, toDate, ...allowedSources) as BankLedgerRow[]

  let runningBalance = openingBalance
  let totalReceipt = 0
  let totalPayment = 0

  const rows: BankTransactionsReportRow[] = ledgerRows.map((row) => {
    const receiptAmount = Number(row.bank_jama || 0)
    const paymentAmount = Number(row.bank_nave || 0)

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
