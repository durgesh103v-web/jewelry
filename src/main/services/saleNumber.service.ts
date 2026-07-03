import { getDatabase } from '../database/connection'

export const saleNumberService = {
  getNextSaleNo() {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT sale_no
        FROM sale_headers
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .get() as { sale_no: string } | undefined

    if (!row?.sale_no) {
      return 'SL-0001'
    }

    const match = row.sale_no.match(/SL-(\d+)/)
    const lastNumber = match ? Number(match[1]) : 0
    const nextNumber = lastNumber + 1

    return `SL-${String(nextNumber).padStart(4, '0')}`
  }
}
