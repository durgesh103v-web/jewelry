import { getDatabase } from '../database/connection'

const SALE_RETURN_PREFIX = 'SRTN'

function extractSaleReturnNumber(returnNo: string): number {
  const cleanReturnNo = String(returnNo || '').trim()
  const expectedPrefix = `${SALE_RETURN_PREFIX}-`

  if (!cleanReturnNo.startsWith(expectedPrefix)) {
    return 0
  }

  const numberPart = cleanReturnNo.replace(expectedPrefix, '')
  const parsed = Number(numberPart)

  return Number.isFinite(parsed) ? parsed : 0
}

export const saleReturnNumberService = {
  getNextSaleReturnNo() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT return_no
        FROM sale_return_headers
        WHERE return_no LIKE ?
        ORDER BY created_at DESC
      `
      )
      .all(`${SALE_RETURN_PREFIX}-%`) as { return_no: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const currentNumber = extractSaleReturnNumber(row.return_no)
      return Math.max(max, currentNumber)
    }, 0)

    const nextNumber = maxNumber + 1

    return `${SALE_RETURN_PREFIX}-${String(nextNumber).padStart(4, '0')}`
  }
}
