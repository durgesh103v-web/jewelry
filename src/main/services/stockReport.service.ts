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
  },

  getItemStockLedger(itemId: string, filter?: { fromDate?: string; toDate?: string }) {
    const db = getDatabase()

    const item = db
      .prepare(
        `
        SELECT
          i.id,
          i.item_name AS itemName,
          i.metal_type AS metalType,
          ig.group_name AS groupName
        FROM items i
        LEFT JOIN item_groups ig ON ig.id = i.item_group_id
        WHERE i.id = ?
        AND i.deleted_at IS NULL
      `
      )
      .get(itemId) as
      | { id: string; itemName: string; metalType: string; groupName: string | null }
      | undefined

    if (!item) {
      throw new Error('Item not found')
    }

    const ledgerQueryBase = `
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
          COALESCE(st.stamp_name, '') AS stampName,
          COALESCE(d.design_name, '') AS designName,
          COALESCE(sh.sale_no, ph.purchase_no, srh.return_no, prh.return_no, '') AS billNo
        FROM stock_ledger sl
        LEFT JOIN item_stamps st ON st.id = sl.stamp_id
        LEFT JOIN item_designs d ON d.id = sl.design_id
        LEFT JOIN sale_headers sh ON sh.id = sl.source_id AND sl.source_type = 'SALE'
        LEFT JOIN purchase_headers ph ON ph.id = sl.source_id AND sl.source_type = 'PURCHASE'
        LEFT JOIN sale_return_headers srh ON srh.id = sl.source_id AND sl.source_type = 'SALE_RETURN'
        LEFT JOIN purchase_return_headers prh ON prh.id = sl.source_id AND sl.source_type = 'PURCHASE_RETURN'
      `

    const fromDate = filter?.fromDate || ''
    const toDate = filter?.toDate || ''

    let runningPcs = 0
    let runningGrossWeight = 0
    let runningNetWeight = 0
    let runningFine = 0

    if (fromDate) {
      const priorRows = db
        .prepare(`${ledgerQueryBase} WHERE sl.item_id = ? AND sl.entry_date < ?`)
        .all(itemId, fromDate) as Array<{
        pcsDelta: number
        grossWeightDelta: number
        netWeightDelta: number
        fineDelta: number
      }>

      for (const row of priorRows) {
        runningPcs += Number(row.pcsDelta ?? 0)
        runningGrossWeight += Number(row.grossWeightDelta ?? 0)
        runningNetWeight += Number(row.netWeightDelta ?? 0)
        runningFine += Number(row.fineDelta ?? 0)
      }
    }

    const openingBalance = {
      pcs: runningPcs,
      grossWeight: runningGrossWeight,
      netWeight: runningNetWeight,
      fine: runningFine
    }

    const conditions = ['sl.item_id = ?']
    const params: string[] = [itemId]

    if (fromDate) {
      conditions.push('sl.entry_date >= ?')
      params.push(fromDate)
    }

    if (toDate) {
      conditions.push('sl.entry_date <= ?')
      params.push(toDate)
    }

    const ledgerRows = db
      .prepare(
        `${ledgerQueryBase} WHERE ${conditions.join(' AND ')} ORDER BY sl.entry_date ASC, sl.created_at ASC`
      )
      .all(...params) as Array<{
      id: string
      sourceType: string
      sourceId: string
      entryDate: string
      metalType: string
      pcsDelta: number
      grossWeightDelta: number
      netWeightDelta: number
      fineDelta: number
      narration: string | null
      stampName: string
      designName: string
      billNo: string
    }>

    const rows = ledgerRows.map((row, index) => {
      runningPcs += Number(row.pcsDelta ?? 0)
      runningGrossWeight += Number(row.grossWeightDelta ?? 0)
      runningNetWeight += Number(row.netWeightDelta ?? 0)
      runningFine += Number(row.fineDelta ?? 0)

      return {
        id: row.id,
        srNo: index + 1,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        billNo: row.billNo || '',
        entryDate: row.entryDate,
        metalType: row.metalType,
        stampName: row.stampName,
        designName: row.designName,
        pcsDelta: Number(row.pcsDelta ?? 0),
        grossWeightDelta: Number(row.grossWeightDelta ?? 0),
        netWeightDelta: Number(row.netWeightDelta ?? 0),
        fineDelta: Number(row.fineDelta ?? 0),
        narration: row.narration ?? '',
        runningPcs,
        runningGrossWeight,
        runningNetWeight,
        runningFine
      }
    })

    return {
      item: {
        id: item.id,
        itemName: item.itemName,
        metalType: item.metalType,
        groupName: item.groupName ?? ''
      },
      openingBalance,
      rows,
      closingBalance: {
        pcs: runningPcs,
        grossWeight: runningGrossWeight,
        netWeight: runningNetWeight,
        fine: runningFine
      }
    }
  }
}
