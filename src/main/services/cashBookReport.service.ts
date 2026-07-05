import { getDatabase } from '../database/connection'
import type {
  CashBookReportFilter,
  CashBookReportResult,
  CashBookReportRow
} from '../../shared/types/cashBookReport'

type CashBookVoucherRow = {
  id: string
  voucher_date: string
  voucher_no: string
  voucher_type: 'RECEIPT' | 'PAYMENT'
  amount: number
  narration: string | null
  account_name: string | null
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getCashBookReport(filter: CashBookReportFilter = {}): CashBookReportResult {
  const db = getDatabase()
  const fromDate = filter.fromDate || getTodayDate()
  const toDate = filter.toDate || getTodayDate()

  const openingRow = db
    .prepare(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN voucher_type = 'RECEIPT' THEN amount
              WHEN voucher_type = 'PAYMENT' THEN -amount
              ELSE 0
            END
          ),
          0
        ) AS opening_balance
      FROM cash_vouchers
      WHERE voucher_date < ?
      AND deleted_at IS NULL
    `
    )
    .get(fromDate) as { opening_balance: number } | undefined

  const openingBalance = Number(openingRow?.opening_balance || 0)

  const voucherRows = db
    .prepare(
      `
      SELECT
        cv.id,
        cv.voucher_date,
        cv.voucher_no,
        cv.voucher_type,
        cv.amount,
        cv.narration,
        a.account_name
      FROM cash_vouchers cv
      LEFT JOIN accounts a ON a.id = cv.account_id
      WHERE cv.voucher_date >= ?
      AND cv.voucher_date <= ?
      AND cv.deleted_at IS NULL
      ORDER BY cv.voucher_date ASC, cv.created_at ASC
    `
    )
    .all(fromDate, toDate) as CashBookVoucherRow[]

  let runningBalance = openingBalance
  let totalReceipt = 0
  let totalPayment = 0

  const rows: CashBookReportRow[] = voucherRows.map((row) => {
    const receiptAmount = row.voucher_type === 'RECEIPT' ? Number(row.amount || 0) : 0
    const paymentAmount = row.voucher_type === 'PAYMENT' ? Number(row.amount || 0) : 0

    runningBalance = runningBalance + receiptAmount - paymentAmount
    totalReceipt += receiptAmount
    totalPayment += paymentAmount

    return {
      id: row.id,
      voucherDate: row.voucher_date,
      voucherNo: row.voucher_no,
      voucherType: row.voucher_type,
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
