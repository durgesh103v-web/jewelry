import { getDatabase } from '../database/connection'
import type { ItemwiseSalePurchaseRecord } from '../../shared/types/itemwiseSalePurchaseReport'

type StockLedgerGroupRow = {
  item_id: string
  item_name: string
  group_name: string | null
  metal_type: string
  source_type: string
  pcs: number
  net_weight: number
  fine: number
}

/**
 * Itemwise Sale Purchase — one row per item comparing total pcs / net weight / fine sold vs
 * purchased, sourced from stock_ledger (grouped by item and source_type). stock_ledger already
 * holds correctly-signed deltas per bill line (SALE deltas are negative, PURCHASE deltas are
 * positive — see sale.service.ts / purchase.service.ts), so this is cleaner than re-deriving
 * totals from sale_item_lines / purchase_item_lines directly.
 */
export const itemwiseSalePurchaseReportService = {
  listItemwiseSalePurchase(): ItemwiseSalePurchaseRecord[] {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT
          i.id AS item_id,
          i.item_name AS item_name,
          ig.group_name AS group_name,
          i.metal_type AS metal_type,
          sl.source_type AS source_type,
          COALESCE(SUM(sl.pcs_delta), 0) AS pcs,
          COALESCE(SUM(sl.net_weight_delta), 0) AS net_weight,
          COALESCE(SUM(sl.fine_delta), 0) AS fine
        FROM stock_ledger sl
        INNER JOIN items i ON i.id = sl.item_id
        LEFT JOIN item_groups ig ON ig.id = i.item_group_id
        WHERE sl.source_type IN ('SALE', 'PURCHASE')
          AND i.deleted_at IS NULL
        GROUP BY i.id, i.item_name, ig.group_name, i.metal_type, sl.source_type
        ORDER BY i.item_name ASC
      `
      )
      .all() as StockLedgerGroupRow[]

    const recordsByItemId = new Map<string, ItemwiseSalePurchaseRecord>()

    for (const row of rows) {
      let record = recordsByItemId.get(row.item_id)

      if (!record) {
        record = {
          itemId: row.item_id,
          itemName: row.item_name,
          groupName: row.group_name || '',
          metalType: row.metal_type,
          salePcs: 0,
          saleNetWeight: 0,
          saleFine: 0,
          purchasePcs: 0,
          purchaseNetWeight: 0,
          purchaseFine: 0
        }
        recordsByItemId.set(row.item_id, record)
      }

      if (row.source_type === 'SALE') {
        record.salePcs = Math.abs(Number(row.pcs || 0))
        record.saleNetWeight = Math.abs(Number(row.net_weight || 0))
        record.saleFine = Math.abs(Number(row.fine || 0))
      } else if (row.source_type === 'PURCHASE') {
        record.purchasePcs = Math.abs(Number(row.pcs || 0))
        record.purchaseNetWeight = Math.abs(Number(row.net_weight || 0))
        record.purchaseFine = Math.abs(Number(row.fine || 0))
      }
    }

    return Array.from(recordsByItemId.values()).sort((a, b) =>
      a.itemName.localeCompare(b.itemName)
    )
  }
}
