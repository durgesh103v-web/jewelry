import { getDatabase } from '../database/connection'

const PURCHASE_RETURN_PREFIX = 'PRTN'

function extractPurchaseReturnNumber(returnNo: string): number {
  const cleanReturnNo = String(returnNo || '').trim()
  const expectedPrefix = `${PURCHASE_RETURN_PREFIX}-`

  if (!cleanReturnNo.startsWith(expectedPrefix)) {
    return 0
  }

  const numberPart = cleanReturnNo.replace(expectedPrefix, '')
  const parsed = Number(numberPart)

  return Number.isFinite(parsed) ? parsed : 0
}

export const purchaseReturnNumberService = {
  getNextPurchaseReturnNo() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT return_no
        FROM purchase_return_headers
        WHERE return_no LIKE ?
        ORDER BY created_at DESC
      `
      )
      .all(`${PURCHASE_RETURN_PREFIX}-%`) as { return_no: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const currentNumber = extractPurchaseReturnNumber(row.return_no)
      return Math.max(max, currentNumber)
    }, 0)

    const nextNumber = maxNumber + 1

    return `${PURCHASE_RETURN_PREFIX}-${String(nextNumber).padStart(4, '0')}`
  }
}
