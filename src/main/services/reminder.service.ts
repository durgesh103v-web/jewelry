import dayjs from 'dayjs'
import { getDatabase } from '../database/connection'

type SaleReminderRow = {
  id: string
  billNo: string
  billDate: string
  reminderDate: string
  fineAmount: number
  majuriAmount: number
  accountName: string
  mobileNumber: string
  metalType: string
}

type ApprovalReminderRow = {
  id: string
  billNo: string
  billDate: string
  reminderDate: string
  fineAmount: number
  majuriAmount: number
  accountName: string
  mobileNumber: string
  metalType: string
}

export type ReminderRecord = {
  id: string
  type: 'Sale' | 'Approval'
  billNo: string
  billDate: string
  reminderDate: string
  accountName: string
  mobileNumber: string
  metalType: string
  fineAmount: number
  majuriAmount: number
  daysUntil: number
  isOverdue: boolean
}

export const reminderService = {
  list(): ReminderRecord[] {
    const db = getDatabase()
    const today = dayjs().startOf('day')

    const saleRows = db
      .prepare(
        `
        SELECT
          sh.id AS id,
          sh.sale_no AS billNo,
          sh.sale_date AS billDate,
          sh.reminder_date AS reminderDate,
          sh.item_fine_total AS fineAmount,
          sh.item_majuri_total AS majuriAmount,
          sh.metal_type AS metalType,
          a.account_name AS accountName,
          a.mobile_number AS mobileNumber
        FROM sale_headers sh
        INNER JOIN accounts a ON a.id = sh.account_id
        WHERE sh.deleted_at IS NULL
        AND sh.reminder_date IS NOT NULL
        AND TRIM(sh.reminder_date) <> ''
      `
      )
      .all() as SaleReminderRow[]

    const approvalRows = db
      .prepare(
        `
        SELECT
          ah.id AS id,
          ah.approval_no AS billNo,
          ah.approval_date AS billDate,
          ah.reminder_date AS reminderDate,
          ah.item_fine_total AS fineAmount,
          ah.item_majuri_total AS majuriAmount,
          ah.metal_type AS metalType,
          a.account_name AS accountName,
          a.mobile_number AS mobileNumber
        FROM approval_headers ah
        INNER JOIN accounts a ON a.id = ah.account_id
        WHERE ah.deleted_at IS NULL
        AND ah.status = 'pending'
        AND ah.reminder_date IS NOT NULL
        AND TRIM(ah.reminder_date) <> ''
      `
      )
      .all() as ApprovalReminderRow[]

    const combined: ReminderRecord[] = [
      ...saleRows.map((row) => ({ ...row, type: 'Sale' as const })),
      ...approvalRows.map((row) => ({ ...row, type: 'Approval' as const }))
    ].map((row) => {
      const reminderDay = dayjs(row.reminderDate)
      const daysUntil = reminderDay.isValid() ? reminderDay.startOf('day').diff(today, 'day') : 0

      return {
        id: row.id,
        type: row.type,
        billNo: row.billNo,
        billDate: row.billDate,
        reminderDate: row.reminderDate,
        accountName: row.accountName,
        mobileNumber: row.mobileNumber || '',
        metalType: row.metalType,
        fineAmount: Number(row.fineAmount || 0),
        majuriAmount: Number(row.majuriAmount || 0),
        daysUntil,
        isOverdue: daysUntil < 0
      }
    })

    combined.sort((a, b) => a.reminderDate.localeCompare(b.reminderDate))

    return combined
  }
}
