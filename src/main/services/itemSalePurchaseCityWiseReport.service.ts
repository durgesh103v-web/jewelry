import { getDatabase } from '../database/connection'
import type { ItemSalePurchaseCityWiseRecord } from '../../shared/types/itemSalePurchaseCityWiseReport'

type StockLedgerCityGroupRow = {
  item_id: string
  item_name: string
  group_name: string | null
  metal_type: string
  city: string | null
  source_type: string
  pcs: number
  net_weight: number
  fine: number
}

/**
 * Item Sale Purchase City Wise — same idea as Itemwise Sale Purchase, but also grouped by the
 * customer/supplier's city (accounts.city), joined via the originating sale_headers /
 * purchase_headers row for each stock_ledger line. Rows with no resolvable account city are
 * grouped under "Unknown".
 */
export const itemSalePurchaseCityWiseReportService = {
  listItemSalePurchaseCityWise(): ItemSalePurchaseCityWiseRecord[] {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT
          i.id AS item_id,
          i.item_name AS item_name,
          ig.group_name AS group_name,
          i.metal_type AS metal_type,
          COALESCE(NULLIF(TRIM(a.city), ''), 'Unknown') AS city,
          sl.source_type AS source_type,
          COALESCE(SUM(sl.pcs_delta), 0) AS pcs,
          COALESCE(SUM(sl.net_weight_delta), 0) AS net_weight,
          COALESCE(SUM(sl.fine_delta), 0) AS fine
        FROM stock_ledger sl
        INNER JOIN items i ON i.id = sl.item_id
        LEFT JOIN item_groups ig ON ig.id = i.item_group_id
        LEFT JOIN sale_headers sh ON sh.id = sl.source_id AND sl.source_type = 'SALE'
        LEFT JOIN purchase_headers ph ON ph.id = sl.source_id AND sl.source_type = 'PURCHASE'
        LEFT JOIN accounts a ON a.id = COALESCE(sh.account_id, ph.account_id)
        WHERE sl.source_type IN ('SALE', 'PURCHASE')
          AND i.deleted_at IS NULL
        GROUP BY i.id, i.item_name, ig.group_name, i.metal_type, city, sl.source_type
        ORDER BY i.item_name ASC, city ASC
      `
      )
      .all() as StockLedgerCityGroupRow[]

    const recordsByKey = new Map<string, ItemSalePurchaseCityWiseRecord>()

    for (const row of rows) {
      const key = `${row.item_id}::${row.city}`
      let record = recordsByKey.get(key)

      if (!record) {
        record = {
          itemId: row.item_id,
          itemName: row.item_name,
          groupName: row.group_name || '',
          metalType: row.metal_type,
          city: row.city || 'Unknown',
          salePcs: 0,
          saleNetWeight: 0,
          saleFine: 0,
          purchasePcs: 0,
          purchaseNetWeight: 0,
          purchaseFine: 0
        }
        recordsByKey.set(key, record)
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

    return Array.from(recordsByKey.values()).sort((a, b) => {
      const itemCompare = a.itemName.localeCompare(b.itemName)
      return itemCompare !== 0 ? itemCompare : a.city.localeCompare(b.city)
    })
  }
}
