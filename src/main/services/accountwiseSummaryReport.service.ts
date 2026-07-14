import { getDatabase } from '../database/connection'
import { accountBalanceService } from './accountBalance.service'
import type { AccountwiseSummaryRecord } from '../../shared/types/accountwiseSummaryReport'

type SalePurchaseTotalsRow = {
  account_id: string
  total_sale_fine: number
  total_sale_value: number
  total_purchase_fine: number
  total_purchase_value: number
}

/**
 * Accountwise Summary — a condensed, one-row-per-account view built on top of Account Balance
 * (accountBalanceService.listAccountBalances) plus Sale/Purchase transaction totals per account.
 *
 * "Value" here means the cash/labour (majuri) component of the bills, i.e. item_majuri_total —
 * the only currency-denominated total that exists on sale_headers/purchase_headers without
 * assuming a metal rate (sale/purchase item lines carry fine weight + majuri cash, but no
 * per-item trading rate column exists in this schema to derive a true INR sale value). Fine is
 * reported separately as the metal-weight component (item_fine_total).
 */
export const accountwiseSummaryReportService = {
  listAccountwiseSummary(): AccountwiseSummaryRecord[] {
    const db = getDatabase()

    const balances = accountBalanceService.listAccountBalances()

    const totalsRows = db
      .prepare(
        `
        SELECT
          account_id,
          COALESCE(SUM(sale_fine), 0) AS total_sale_fine,
          COALESCE(SUM(sale_value), 0) AS total_sale_value,
          COALESCE(SUM(purchase_fine), 0) AS total_purchase_fine,
          COALESCE(SUM(purchase_value), 0) AS total_purchase_value
        FROM (
          SELECT
            sh.account_id AS account_id,
            sh.item_fine_total AS sale_fine,
            sh.item_majuri_total AS sale_value,
            0 AS purchase_fine,
            0 AS purchase_value
          FROM sale_headers sh
          WHERE sh.deleted_at IS NULL

          UNION ALL

          SELECT
            ph.account_id AS account_id,
            0 AS sale_fine,
            0 AS sale_value,
            ph.item_fine_total AS purchase_fine,
            ph.item_majuri_total AS purchase_value
          FROM purchase_headers ph
          WHERE ph.deleted_at IS NULL
        )
        GROUP BY account_id
      `
      )
      .all() as SalePurchaseTotalsRow[]

    const totalsByAccountId = new Map(totalsRows.map((row) => [row.account_id, row]))

    return balances.map((account) => {
      const totals = totalsByAccountId.get(account.id)

      return {
        id: account.id,
        accountName: account.accountName,
        otherName: account.otherName,
        mobileNumber: account.mobileNumber,
        city: account.city,
        groupName: account.groupName,
        totalSaleFine: Number(totals?.total_sale_fine || 0),
        totalSaleValue: Number(totals?.total_sale_value || 0),
        totalPurchaseFine: Number(totals?.total_purchase_fine || 0),
        totalPurchaseValue: Number(totals?.total_purchase_value || 0),
        goldFine: account.goldFine,
        silverFine: account.silverFine,
        cash: account.cash,
        anamat: account.anamat,
        bank: account.bank
      }
    })
  }
}
