import { getDatabase } from '../database/connection'
import { getCashBookReport } from './cashBookReport.service'

const FINE_SOURCE_TYPES = ['SALE', 'PURCHASE', 'SALE_RETURN', 'PURCHASE_RETURN']

export type DailySummaryFilter = {
  date?: string
}

export type DailySummarySalesSection = {
  count: number
  itemFineTotal: number
  itemMajuriTotal: number
  amountTotal: number
}

export type DailySummaryReturnSection = {
  count: number
  itemFineTotal: number
  itemMajuriTotal: number
}

export type DailySummaryCashVoucherSection = {
  count: number
  amountTotal: number
}

export type DailySummaryApprovalSection = {
  count: number
  itemFineTotal: number
  itemMajuriTotal: number
}

export type DailySummaryCashSection = {
  openingBalance: number
  totalReceipt: number
  totalPayment: number
  closingBalance: number
  netMovement: number
}

export type DailySummaryFineSection = {
  goldIn: number
  goldOut: number
  goldNet: number
  silverIn: number
  silverOut: number
  silverNet: number
}

export type DailySummaryResult = {
  date: string
  sales: DailySummarySalesSection
  purchases: DailySummarySalesSection
  saleReturns: DailySummaryReturnSection
  purchaseReturns: DailySummaryReturnSection
  cashReceipts: DailySummaryCashVoucherSection
  cashPayments: DailySummaryCashVoucherSection
  approvals: DailySummaryApprovalSection
  cash: DailySummaryCashSection
  fine: DailySummaryFineSection
}

type HeaderAmountRow = {
  count: number
  itemFineTotal: number
  itemMajuriTotal: number
  amountTotal: number
}

type ReturnRow = {
  count: number
  itemFineTotal: number
  itemMajuriTotal: number
}

type CashVoucherRow = {
  count: number
  amountTotal: number
}

type FineLedgerRow = {
  metalType: string
  fineIn: number
  fineOut: number
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export const dailyReportService = {
  getDailySummary(filter: DailySummaryFilter = {}): DailySummaryResult {
    const db = getDatabase()
    const date = filter.date || getTodayDate()

    const salesRow = db
      .prepare(
        `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(item_fine_total), 0) AS itemFineTotal,
          COALESCE(SUM(item_majuri_total), 0) AS itemMajuriTotal,
          COALESCE(SUM(taxable_amount + cgst_amount + sgst_amount + igst_amount), 0) AS amountTotal
        FROM sale_headers
        WHERE sale_date = ? AND deleted_at IS NULL
      `
      )
      .get(date) as HeaderAmountRow

    const purchasesRow = db
      .prepare(
        `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(item_fine_total), 0) AS itemFineTotal,
          COALESCE(SUM(item_majuri_total), 0) AS itemMajuriTotal,
          COALESCE(SUM(taxable_amount + cgst_amount + sgst_amount + igst_amount), 0) AS amountTotal
        FROM purchase_headers
        WHERE purchase_date = ? AND deleted_at IS NULL
      `
      )
      .get(date) as HeaderAmountRow

    const saleReturnsRow = db
      .prepare(
        `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(item_fine_total), 0) AS itemFineTotal,
          COALESCE(SUM(item_majuri_total), 0) AS itemMajuriTotal
        FROM sale_return_headers
        WHERE return_date = ? AND deleted_at IS NULL
      `
      )
      .get(date) as ReturnRow

    const purchaseReturnsRow = db
      .prepare(
        `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(item_fine_total), 0) AS itemFineTotal,
          COALESCE(SUM(item_majuri_total), 0) AS itemMajuriTotal
        FROM purchase_return_headers
        WHERE return_date = ? AND deleted_at IS NULL
      `
      )
      .get(date) as ReturnRow

    const cashReceiptsRow = db
      .prepare(
        `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(amount), 0) AS amountTotal
        FROM cash_vouchers
        WHERE voucher_date = ? AND voucher_type = 'RECEIPT' AND deleted_at IS NULL
      `
      )
      .get(date) as CashVoucherRow

    const cashPaymentsRow = db
      .prepare(
        `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(amount), 0) AS amountTotal
        FROM cash_vouchers
        WHERE voucher_date = ? AND voucher_type = 'PAYMENT' AND deleted_at IS NULL
      `
      )
      .get(date) as CashVoucherRow

    const approvalsRow = db
      .prepare(
        `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(item_fine_total), 0) AS itemFineTotal,
          COALESCE(SUM(item_majuri_total), 0) AS itemMajuriTotal
        FROM approval_headers
        WHERE approval_date = ? AND deleted_at IS NULL
      `
      )
      .get(date) as ReturnRow

    const cashBook = getCashBookReport({ fromDate: date, toDate: date })

    const fineLedgerRows = db
      .prepare(
        `
        SELECT
          metal_type AS metalType,
          COALESCE(SUM(fine_jama), 0) AS fineIn,
          COALESCE(SUM(fine_nave), 0) AS fineOut
        FROM account_ledger
        WHERE entry_date = ?
          AND source_type IN (${FINE_SOURCE_TYPES.map(() => '?').join(', ')})
        GROUP BY metal_type
      `
      )
      .all(date, ...FINE_SOURCE_TYPES) as FineLedgerRow[]

    let goldIn = 0
    let goldOut = 0
    let silverIn = 0
    let silverOut = 0

    for (const row of fineLedgerRows) {
      if (row.metalType === 'Gold') {
        goldIn += Number(row.fineIn || 0)
        goldOut += Number(row.fineOut || 0)
      } else if (row.metalType === 'Silver') {
        silverIn += Number(row.fineIn || 0)
        silverOut += Number(row.fineOut || 0)
      }
    }

    return {
      date,
      sales: {
        count: Number(salesRow?.count || 0),
        itemFineTotal: Number(salesRow?.itemFineTotal || 0),
        itemMajuriTotal: Number(salesRow?.itemMajuriTotal || 0),
        amountTotal: Number(salesRow?.amountTotal || 0)
      },
      purchases: {
        count: Number(purchasesRow?.count || 0),
        itemFineTotal: Number(purchasesRow?.itemFineTotal || 0),
        itemMajuriTotal: Number(purchasesRow?.itemMajuriTotal || 0),
        amountTotal: Number(purchasesRow?.amountTotal || 0)
      },
      saleReturns: {
        count: Number(saleReturnsRow?.count || 0),
        itemFineTotal: Number(saleReturnsRow?.itemFineTotal || 0),
        itemMajuriTotal: Number(saleReturnsRow?.itemMajuriTotal || 0)
      },
      purchaseReturns: {
        count: Number(purchaseReturnsRow?.count || 0),
        itemFineTotal: Number(purchaseReturnsRow?.itemFineTotal || 0),
        itemMajuriTotal: Number(purchaseReturnsRow?.itemMajuriTotal || 0)
      },
      cashReceipts: {
        count: Number(cashReceiptsRow?.count || 0),
        amountTotal: Number(cashReceiptsRow?.amountTotal || 0)
      },
      cashPayments: {
        count: Number(cashPaymentsRow?.count || 0),
        amountTotal: Number(cashPaymentsRow?.amountTotal || 0)
      },
      approvals: {
        count: Number(approvalsRow?.count || 0),
        itemFineTotal: Number(approvalsRow?.itemFineTotal || 0),
        itemMajuriTotal: Number(approvalsRow?.itemMajuriTotal || 0)
      },
      cash: {
        openingBalance: cashBook.summary.openingBalance,
        totalReceipt: cashBook.summary.totalReceipt,
        totalPayment: cashBook.summary.totalPayment,
        closingBalance: cashBook.summary.closingBalance,
        netMovement: cashBook.summary.totalReceipt - cashBook.summary.totalPayment
      },
      fine: {
        goldIn,
        goldOut,
        goldNet: goldIn - goldOut,
        silverIn,
        silverOut,
        silverNet: silverIn - silverOut
      }
    }
  }
}
