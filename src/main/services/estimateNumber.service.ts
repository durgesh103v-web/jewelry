import { getDatabase } from '../database/connection'

const ESTIMATE_PREFIX = 'EST'

function extractEstimateNumber(estimateNo: string): number {
  const cleanEstimateNo = String(estimateNo || '').trim()
  const expectedPrefix = `${ESTIMATE_PREFIX}-`

  if (!cleanEstimateNo.startsWith(expectedPrefix)) {
    return 0
  }

  const numberPart = cleanEstimateNo.replace(expectedPrefix, '')
  const parsed = Number(numberPart)

  return Number.isFinite(parsed) ? parsed : 0
}

export const estimateNumberService = {
  getNextEstimateNo() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT estimate_no
        FROM estimate_headers
        WHERE estimate_no LIKE ?
        ORDER BY created_at DESC
      `
      )
      .all(`${ESTIMATE_PREFIX}-%`) as { estimate_no: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const currentNumber = extractEstimateNumber(row.estimate_no)
      return Math.max(max, currentNumber)
    }, 0)

    const nextNumber = maxNumber + 1

    return `${ESTIMATE_PREFIX}-${String(nextNumber).padStart(4, '0')}`
  }
}
