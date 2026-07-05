import { getDatabase } from '../database/connection'

function extractPurchaseNumber(purchaseNo: string): number {
  const cleanPurchaseNo = String(purchaseNo || '').trim()

  if (!cleanPurchaseNo.startsWith('PR-')) {
    return 0
  }

  const numberPart = cleanPurchaseNo.replace('PR-', '')
  const parsed = Number(numberPart)

  return Number.isFinite(parsed) ? parsed : 0
}

export const purchaseNumberService = {
  getNextPurchaseNo() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT purchase_no
        FROM purchase_headers
        WHERE purchase_no LIKE 'PR-%'
        ORDER BY created_at DESC
      `
      )
      .all() as { purchase_no: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const currentNumber = extractPurchaseNumber(row.purchase_no)
      return Math.max(max, currentNumber)
    }, 0)

    const nextNumber = maxNumber + 1

    return `PR-${String(nextNumber).padStart(4, '0')}`
  }
}
