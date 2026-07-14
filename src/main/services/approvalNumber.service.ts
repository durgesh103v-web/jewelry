import { getDatabase } from '../database/connection'

const APPROVAL_PREFIX = 'APR'

function extractApprovalNumber(approvalNo: string): number {
  const cleanApprovalNo = String(approvalNo || '').trim()
  const expectedPrefix = `${APPROVAL_PREFIX}-`

  if (!cleanApprovalNo.startsWith(expectedPrefix)) {
    return 0
  }

  const numberPart = cleanApprovalNo.replace(expectedPrefix, '')
  const parsed = Number(numberPart)

  return Number.isFinite(parsed) ? parsed : 0
}

export const approvalNumberService = {
  getNextApprovalNo() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT approval_no
        FROM approval_headers
        WHERE approval_no LIKE ?
        ORDER BY created_at DESC
      `
      )
      .all(`${APPROVAL_PREFIX}-%`) as { approval_no: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const currentNumber = extractApprovalNumber(row.approval_no)
      return Math.max(max, currentNumber)
    }, 0)

    const nextNumber = maxNumber + 1

    return `${APPROVAL_PREFIX}-${String(nextNumber).padStart(4, '0')}`
  }
}
