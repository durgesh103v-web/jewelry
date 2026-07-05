import { getDatabase } from '../database/connection'

function getActiveBillPrefix(): string {
  const db = getDatabase()

  const row = db
    .prepare(
      `
      SELECT bill_prefix
      FROM firm_settings
      WHERE id = 'default-firm'
    `
    )
    .get() as { bill_prefix?: string } | undefined

  const prefix = row?.bill_prefix?.trim()

  if (!prefix) {
    return 'SL'
  }

  return prefix.toUpperCase()
}

function extractBillNumber(saleNo: string, prefix: string): number {
  const cleanSaleNo = String(saleNo || '').trim()
  const expectedPrefix = `${prefix}-`

  if (!cleanSaleNo.startsWith(expectedPrefix)) {
    return 0
  }

  const numberPart = cleanSaleNo.replace(expectedPrefix, '')
  const parsed = Number(numberPart)

  return Number.isFinite(parsed) ? parsed : 0
}

export const saleNumberService = {
  getNextSaleNo() {
    const db = getDatabase()
    const prefix = getActiveBillPrefix()

    const rows = db
      .prepare(
        `
        SELECT sale_no
        FROM sale_headers
        WHERE sale_no LIKE ?
        ORDER BY created_at DESC
      `
      )
      .all(`${prefix}-%`) as { sale_no: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const currentNumber = extractBillNumber(row.sale_no, prefix)
      return Math.max(max, currentNumber)
    }, 0)

    const nextNumber = maxNumber + 1

    return `${prefix}-${String(nextNumber).padStart(4, '0')}`
  }
}
