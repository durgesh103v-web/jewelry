import { getDatabase } from '../database/connection'

const REPAIR_ENTRY_PREFIX = 'RPR'

function extractRepairNumber(repairNo: string): number {
  const cleanRepairNo = String(repairNo || '').trim()
  const expectedPrefix = `${REPAIR_ENTRY_PREFIX}-`

  if (!cleanRepairNo.startsWith(expectedPrefix)) {
    return 0
  }

  const numberPart = cleanRepairNo.replace(expectedPrefix, '')
  const parsed = Number(numberPart)

  return Number.isFinite(parsed) ? parsed : 0
}

export const repairEntryNumberService = {
  getNextRepairNo() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT repair_no
        FROM repair_entries
        WHERE repair_no LIKE ?
        ORDER BY created_at DESC
      `
      )
      .all(`${REPAIR_ENTRY_PREFIX}-%`) as { repair_no: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const currentNumber = extractRepairNumber(row.repair_no)
      return Math.max(max, currentNumber)
    }, 0)

    const nextNumber = maxNumber + 1

    return `${REPAIR_ENTRY_PREFIX}-${String(nextNumber).padStart(4, '0')}`
  }
}
