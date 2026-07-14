import { getDatabase } from '../database/connection'

const JOB_WORK_PREFIX = 'JW'

function extractJobWorkNumber(orderNo: string): number {
  const cleanOrderNo = String(orderNo || '').trim()
  const expectedPrefix = `${JOB_WORK_PREFIX}-`

  if (!cleanOrderNo.startsWith(expectedPrefix)) {
    return 0
  }

  const numberPart = cleanOrderNo.replace(expectedPrefix, '')
  const parsed = Number(numberPart)

  return Number.isFinite(parsed) ? parsed : 0
}

export const jobWorkNumberService = {
  getNextJobWorkNo() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT order_no
        FROM job_work_orders
        WHERE order_no LIKE ?
        ORDER BY created_at DESC
      `
      )
      .all(`${JOB_WORK_PREFIX}-%`) as { order_no: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const currentNumber = extractJobWorkNumber(row.order_no)
      return Math.max(max, currentNumber)
    }, 0)

    const nextNumber = maxNumber + 1

    return `${JOB_WORK_PREFIX}-${String(nextNumber).padStart(4, '0')}`
  }
}
