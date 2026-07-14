import { getDatabase } from '../database/connection'
import type {
  PaymentReceiptFilter,
  PaymentReceiptResult,
  PaymentReceiptRow
} from '../../shared/types/paymentReceiptReport'

type PaymentLedgerRow = {
  id: string
  entry_date: string
  source_type: string
  metal_type: string | null
  fine_jama: number
  fine_nave: number
  cash_jama: number
  cash_nave: number
  bank_jama: number
  bank_nave: number
  anamat_jama: number
  anamat_nave: number
  narration: string | null
  account_name: string | null
  sale_no: string | null
  purchase_no: string | null
  voucher_no: string | null
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

function getDisplayVoucherNo(row: PaymentLedgerRow): string {
  return row.sale_no || row.purchase_no || row.voucher_no || '-'
}

/**
 * Payment / Receipt — a unified register of every payment-type account_ledger entry
 * (SALE_PAYMENT, PURCHASE_PAYMENT, CASH_RECEIPT, CASH_PAYMENT), showing both the cash AND the
 * fine (metal weight) component of every payment leg together. Unlike Cash Book (which is
 * cash-only), this report keeps fine_jama / fine_nave alongside cash/bank/anamat so the fine
 * settlement portion of a sale or purchase payment is visible in the same row.
 */
export function getPaymentReceiptReport(
  filter: PaymentReceiptFilter = {}
): PaymentReceiptResult {
  const db = getDatabase()
  const fromDate = filter.fromDate || getTodayDate()
  const toDate = filter.toDate || getTodayDate()
  const sourcePlaceholders = allowedSources.map(() => '?').join(', ')

  const ledgerRows = db
    .prepare(
      `
      SELECT
        al.id,
        al.entry_date,
        al.source_type,
        al.metal_type,
        al.fine_jama,
        al.fine_nave,
        al.cash_jama,
        al.cash_nave,
        al.bank_jama,
        al.bank_nave,
        al.anamat_jama,
        al.anamat_nave,
        al.narration,
        a.account_name,
        sh.sale_no,
        ph.purchase_no,
        cv.voucher_no
      FROM account_ledger al
      LEFT JOIN accounts a ON a.id = al.account_id
      LEFT JOIN sale_headers sh ON sh.id = al.source_id AND al.source_type = 'SALE_PAYMENT'
      LEFT JOIN purchase_headers ph ON ph.id = al.source_id AND al.source_type = 'PURCHASE_PAYMENT'
      LEFT JOIN cash_vouchers cv ON cv.id = al.source_id AND al.source_type IN ('CASH_RECEIPT', 'CASH_PAYMENT')
      WHERE al.entry_date >= ?
        AND al.entry_date <= ?
        AND al.source_type IN (${sourcePlaceholders})
      ORDER BY al.entry_date ASC, al.created_at ASC, al.id ASC
    `
    )
    .all(fromDate, toDate, ...allowedSources) as PaymentLedgerRow[]

  const summary = {
    totalFineJama: 0,
    totalFineNave: 0,
    totalCashJama: 0,
    totalCashNave: 0,
    totalBankJama: 0,
    totalBankNave: 0,
    totalAnamatJama: 0,
    totalAnamatNave: 0,
    recordCount: 0
  }

  const rows: PaymentReceiptRow[] = ledgerRows.map((row) => {
    const fineJama = Number(row.fine_jama || 0)
    const fineNave = Number(row.fine_nave || 0)
    const cashJama = Number(row.cash_jama || 0)
    const cashNave = Number(row.cash_nave || 0)
    const bankJama = Number(row.bank_jama || 0)
    const bankNave = Number(row.bank_nave || 0)
    const anamatJama = Number(row.anamat_jama || 0)
    const anamatNave = Number(row.anamat_nave || 0)

    summary.totalFineJama += fineJama
    summary.totalFineNave += fineNave
    summary.totalCashJama += cashJama
    summary.totalCashNave += cashNave
    summary.totalBankJama += bankJama
    summary.totalBankNave += bankNave
    summary.totalAnamatJama += anamatJama
    summary.totalAnamatNave += anamatNave
    summary.recordCount += 1

    return {
      id: row.id,
      entryDate: row.entry_date,
      voucherNo: getDisplayVoucherNo(row),
      sourceType: row.source_type,
      sourceLabel: getSourceLabel(row.source_type),
      accountName: row.account_name || '',
      metalType: row.metal_type || '',
      fineJama,
      fineNave,
      cashJama,
      cashNave,
      bankJama,
      bankNave,
      anamatJama,
      anamatNave,
      narration: row.narration || ''
    }
  })

  return { rows, summary }
}
