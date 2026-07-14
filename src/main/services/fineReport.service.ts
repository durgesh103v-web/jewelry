import { getDatabase } from '../database/connection'

export type FineReportFilter = {
  fromDate?: string
  toDate?: string
}

const FINE_SOURCE_TYPES = ['SALE', 'PURCHASE', 'SALE_RETURN', 'PURCHASE_RETURN']
const CASH_FINE_OPENING_ID = 'default-cash-fine-opening'

type CashFineOpeningRow = {
  gold_purchase_fine: number
  gold_sale_fine: number
  silver_purchase_fine: number
  silver_sale_fine: number
}

type LedgerGroupRow = {
  entryDate: string
  metalType: string
  fineIn: number
  fineOut: number
}

export type FineRojmelRow = {
  id: string
  entryDate: string
  metalType: string
  fineIn: number
  fineOut: number
  balance: number
}

export type FineRojmelSummary = {
  openingGoldBalance: number
  totalGoldIn: number
  totalGoldOut: number
  closingGoldBalance: number
  openingSilverBalance: number
  totalSilverIn: number
  totalSilverOut: number
  closingSilverBalance: number
}

export type FineMarginRow = {
  id: string
  billDate: string
  billNo: string
  accountId: string
  accountName: string
  metalType: string
  itemName: string
  pcs: number
  netWeight: number
  tunch: number
  wastage: number
  hishob: number
  fine: number
  majuri: number
  wastageFineValue: number
}

export type FineMarginSummary = {
  totalNetWeight: number
  totalFine: number
  totalMajuri: number
  totalWastageFineValue: number
  recordCount: number
}

function buildDateFilter(
  column: string,
  filter: FineReportFilter
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

export const fineReportService = {
  getFineRojmel(filter: FineReportFilter = {}): { rows: FineRojmelRow[]; summary: FineRojmelSummary } {
    const db = getDatabase()
    const sourcePlaceholders = FINE_SOURCE_TYPES.map(() => '?').join(', ')

    const openingSettings = db
      .prepare(
        `
        SELECT gold_purchase_fine, gold_sale_fine, silver_purchase_fine, silver_sale_fine
        FROM cash_fine_opening_settings
        WHERE id = ?
      `
      )
      .get(CASH_FINE_OPENING_ID) as CashFineOpeningRow | undefined

    const openingGoldFineSetting =
      Number(openingSettings?.gold_purchase_fine || 0) - Number(openingSettings?.gold_sale_fine || 0)
    const openingSilverFineSetting =
      Number(openingSettings?.silver_purchase_fine || 0) -
      Number(openingSettings?.silver_sale_fine || 0)

    function getPriorBalance(metalType: string): number {
      if (!filter.fromDate) return 0

      const row = db
        .prepare(
          `
          SELECT COALESCE(SUM(fine_jama - fine_nave), 0) AS balance
          FROM account_ledger
          WHERE metal_type = ?
            AND source_type IN (${sourcePlaceholders})
            AND entry_date < ?
        `
        )
        .get(metalType, ...FINE_SOURCE_TYPES, filter.fromDate) as { balance: number }

      return Number(row?.balance || 0)
    }

    const openingGoldBalance = openingGoldFineSetting + getPriorBalance('Gold')
    const openingSilverBalance = openingSilverFineSetting + getPriorBalance('Silver')

    const { clause, params } = buildDateFilter('entry_date', filter)

    const ledgerRows = db
      .prepare(
        `
        SELECT
          entry_date AS entryDate,
          metal_type AS metalType,
          COALESCE(SUM(fine_jama), 0) AS fineIn,
          COALESCE(SUM(fine_nave), 0) AS fineOut
        FROM account_ledger
        WHERE source_type IN (${sourcePlaceholders})${clause}
        GROUP BY entry_date, metal_type
        ORDER BY entry_date ASC, metal_type ASC
      `
      )
      .all(...FINE_SOURCE_TYPES, ...params) as LedgerGroupRow[]

    let goldBalance = openingGoldBalance
    let silverBalance = openingSilverBalance
    let totalGoldIn = 0
    let totalGoldOut = 0
    let totalSilverIn = 0
    let totalSilverOut = 0

    const rows: FineRojmelRow[] = ledgerRows.map((row) => {
      const fineIn = Number(row.fineIn || 0)
      const fineOut = Number(row.fineOut || 0)

      if (row.metalType === 'Gold') {
        goldBalance += fineIn - fineOut
        totalGoldIn += fineIn
        totalGoldOut += fineOut
      } else if (row.metalType === 'Silver') {
        silverBalance += fineIn - fineOut
        totalSilverIn += fineIn
        totalSilverOut += fineOut
      }

      return {
        id: `${row.entryDate}-${row.metalType}`,
        entryDate: row.entryDate,
        metalType: row.metalType,
        fineIn,
        fineOut,
        balance: row.metalType === 'Gold' ? goldBalance : row.metalType === 'Silver' ? silverBalance : 0
      }
    })

    return {
      rows,
      summary: {
        openingGoldBalance,
        totalGoldIn,
        totalGoldOut,
        closingGoldBalance: openingGoldBalance + totalGoldIn - totalGoldOut,
        openingSilverBalance,
        totalSilverIn,
        totalSilverOut,
        closingSilverBalance: openingSilverBalance + totalSilverIn - totalSilverOut
      }
    }
  },

  getFineMargin(filter: FineReportFilter = {}): { rows: FineMarginRow[]; summary: FineMarginSummary } {
    const db = getDatabase()
    const { clause, params } = buildDateFilter('sh.sale_date', filter)

    const rows = db
      .prepare(
        `
        SELECT
          sil.id AS id,
          sh.sale_date AS billDate,
          sh.sale_no AS billNo,
          sh.account_id AS accountId,
          a.account_name AS accountName,
          sh.metal_type AS metalType,
          sil.item_name_snapshot AS itemName,
          sil.pcs AS pcs,
          sil.net_weight AS netWeight,
          sil.tunch AS tunch,
          sil.wastage AS wastage,
          sil.hishob AS hishob,
          sil.fine AS fine,
          sil.majuri AS majuri,
          ROUND(sil.net_weight * sil.wastage / 100, 3) AS wastageFineValue
        FROM sale_item_lines sil
        INNER JOIN sale_headers sh ON sh.id = sil.sale_id
        INNER JOIN accounts a ON a.id = sh.account_id
        WHERE sh.deleted_at IS NULL${clause}
        ORDER BY sh.sale_date DESC, sh.created_at DESC, sil.line_no ASC
      `
      )
      .all(...params) as FineMarginRow[]

    const summary = rows.reduce<FineMarginSummary>(
      (total, row) => {
        total.totalNetWeight += Number(row.netWeight || 0)
        total.totalFine += Number(row.fine || 0)
        total.totalMajuri += Number(row.majuri || 0)
        total.totalWastageFineValue += Number(row.wastageFineValue || 0)
        total.recordCount += 1
        return total
      },
      {
        totalNetWeight: 0,
        totalFine: 0,
        totalMajuri: 0,
        totalWastageFineValue: 0,
        recordCount: 0
      }
    )

    return { rows, summary }
  }
}
