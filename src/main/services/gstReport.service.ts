import { getDatabase } from '../database/connection'

export type GstReportFilter = {
  fromDate?: string
  toDate?: string
}

function buildDateFilter(
  column: string,
  filter: GstReportFilter
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

export const gstReportService = {
  listGstPurchases(filter: GstReportFilter = {}) {
    const db = getDatabase()
    const { clause, params } = buildDateFilter('ph.purchase_date', filter)

    return db
      .prepare(
        `
        SELECT
          ph.id AS id,
          ph.purchase_no AS billNo,
          ph.purchase_date AS billDate,
          ph.account_id AS accountId,
          a.account_name AS accountName,
          COALESCE(a.gst_no, '') AS gstNo,
          ph.metal_type AS metalType,
          ph.taxable_amount AS taxableAmount,
          ph.cgst_amount AS cgstAmount,
          ph.sgst_amount AS sgstAmount,
          ph.igst_amount AS igstAmount,
          (ph.cgst_amount + ph.sgst_amount + ph.igst_amount) AS totalTax,
          (ph.taxable_amount + ph.cgst_amount + ph.sgst_amount + ph.igst_amount) AS totalAmount,
          ph.created_at AS createdAt
        FROM purchase_headers ph
        INNER JOIN accounts a ON a.id = ph.account_id
        WHERE ph.deleted_at IS NULL${clause}
        ORDER BY ph.purchase_date DESC, ph.created_at DESC
      `
      )
      .all(...params)
  },

  listGstSales(filter: GstReportFilter = {}) {
    const db = getDatabase()
    const { clause, params } = buildDateFilter('sh.sale_date', filter)

    return db
      .prepare(
        `
        SELECT
          sh.id AS id,
          sh.sale_no AS billNo,
          sh.sale_date AS billDate,
          sh.account_id AS accountId,
          a.account_name AS accountName,
          COALESCE(a.gst_no, '') AS gstNo,
          sh.metal_type AS metalType,
          sh.taxable_amount AS taxableAmount,
          sh.cgst_amount AS cgstAmount,
          sh.sgst_amount AS sgstAmount,
          sh.igst_amount AS igstAmount,
          (sh.cgst_amount + sh.sgst_amount + sh.igst_amount) AS totalTax,
          (sh.taxable_amount + sh.cgst_amount + sh.sgst_amount + sh.igst_amount) AS totalAmount,
          sh.created_at AS createdAt
        FROM sale_headers sh
        INNER JOIN accounts a ON a.id = sh.account_id
        WHERE sh.deleted_at IS NULL${clause}
        ORDER BY sh.sale_date DESC, sh.created_at DESC
      `
      )
      .all(...params)
  }
}
