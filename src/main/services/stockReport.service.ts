import { getDatabase } from '../database/connection'

export const stockReportService = {
  listItemStock() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          i.id AS itemId,
          i.item_name AS itemName,
          i.metal_type AS metalType,
          ig.group_name AS groupName,
          COALESCE(sl.stamp_id, '') AS stampId,
          COALESCE(st.stamp_name, '') AS stampName,
          COALESCE(sl.design_id, '') AS designId,
          COALESCE(d.design_name, '') AS designName,
          COALESCE(SUM(sl.pcs_delta), 0) AS pcs,
          COALESCE(SUM(sl.gross_weight_delta), 0) AS grossWeight,
          COALESCE(SUM(sl.net_weight_delta), 0) AS netWeight,
          COALESCE(SUM(sl.fine_delta), 0) AS fine
        FROM stock_ledger sl
        INNER JOIN items i ON i.id = sl.item_id
        LEFT JOIN item_groups ig ON ig.id = i.item_group_id
        LEFT JOIN item_stamps st ON st.id = sl.stamp_id
        LEFT JOIN item_designs d ON d.id = sl.design_id
        WHERE i.deleted_at IS NULL
        GROUP BY
          i.id,
          i.item_name,
          i.metal_type,
          ig.group_name,
          sl.stamp_id,
          st.stamp_name,
          sl.design_id,
          d.design_name
        ORDER BY i.item_name ASC
      `
      )
      .all()
  },

  listItemTransactions() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          sl.id,
          sl.source_type AS sourceType,
          sl.source_id AS sourceId,
          sl.entry_date AS entryDate,
          sl.metal_type AS metalType,
          sl.pcs_delta AS pcsDelta,
          sl.gross_weight_delta AS grossWeightDelta,
          sl.net_weight_delta AS netWeightDelta,
          sl.fine_delta AS fineDelta,
          sl.narration,
          sl.created_at AS createdAt,
          i.id AS itemId,
          i.item_name AS itemName,
          ig.group_name AS groupName,
          COALESCE(st.stamp_name, '') AS stampName,
          COALESCE(d.design_name, '') AS designName,
          COALESCE(sh.sale_no, ph.purchase_no, '') AS saleNo
        FROM stock_ledger sl
        INNER JOIN items i ON i.id = sl.item_id
        LEFT JOIN item_groups ig ON ig.id = i.item_group_id
        LEFT JOIN item_stamps st ON st.id = sl.stamp_id
        LEFT JOIN item_designs d ON d.id = sl.design_id
        LEFT JOIN sale_headers sh ON sh.id = sl.source_id AND sl.source_type = 'SALE'
        LEFT JOIN purchase_headers ph ON ph.id = sl.source_id AND sl.source_type = 'PURCHASE'
        WHERE i.deleted_at IS NULL
        ORDER BY sl.entry_date DESC, sl.created_at DESC
      `
      )
      .all()
  }
}
