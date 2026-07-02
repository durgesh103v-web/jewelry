import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const accountSchema = z.object({
  accountName: z.string().trim().min(1, 'Account name is required').max(120),
  otherName: z.string().trim().max(120).optional().default(''),
  accountGroupId: z.string().trim().min(1, 'Account group is required'),
  mobileNumber: z.string().trim().max(20).optional().default(''),
  whatsappNumber: z.string().trim().max(20).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  state: z.string().trim().max(80).optional().default(''),
  gstNo: z.string().trim().max(30).optional().default(''),
  panNo: z.string().trim().max(30).optional().default(''),
  openingGoldFine: z.coerce.number().default(0),
  openingSilverFine: z.coerce.number().default(0),
  openingCash: z.coerce.number().default(0),
  openingAnamat: z.coerce.number().default(0),
  openingBank: z.coerce.number().default(0),
  active: z.boolean().default(true)
})

type AccountPayload = z.infer<typeof accountSchema>

type AccountRecord = {
  id: string
  accountName: string
  otherName: string
  accountGroupId: string
  groupName: string
  groupType: string
  mobileNumber: string
  whatsappNumber: string
  city: string
  state: string
  gstNo: string
  panNo: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  active: boolean
  createdAt: string
  updatedAt: string
}

type AccountRow = {
  id: string
  account_name: string
  other_name: string | null
  account_group_id: string
  group_name: string
  group_type: string
  mobile_number: string | null
  whatsapp_number: string | null
  city: string | null
  state: string | null
  gst_no: string | null
  pan_no: string | null
  opening_gold_fine: number
  opening_silver_fine: number
  opening_cash: number
  opening_anamat: number
  opening_bank: number
  active: number
  created_at: string
  updated_at: string
}

function mapRow(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    accountName: row.account_name,
    otherName: row.other_name ?? '',
    accountGroupId: row.account_group_id,
    groupName: row.group_name,
    groupType: row.group_type,
    mobileNumber: row.mobile_number ?? '',
    whatsappNumber: row.whatsapp_number ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    gstNo: row.gst_no ?? '',
    panNo: row.pan_no ?? '',
    openingGoldFine: Number(row.opening_gold_fine ?? 0),
    openingSilverFine: Number(row.opening_silver_fine ?? 0),
    openingCash: Number(row.opening_cash ?? 0),
    openingAnamat: Number(row.opening_anamat ?? 0),
    openingBank: Number(row.opening_bank ?? 0),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function assertAccountGroupExists(accountGroupId: string): void {
  const db = getDatabase()
  const groupExists = db
    .prepare(
      `
      SELECT id
      FROM account_groups
      WHERE id = ?
      AND deleted_at IS NULL
    `
    )
    .get(accountGroupId)

  if (!groupExists) {
    throw new Error('Account group not found')
  }
}

export const accountService = {
  list() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT
          a.id,
          a.account_name,
          a.other_name,
          a.account_group_id,
          ag.group_name,
          ag.group_type,
          a.mobile_number,
          a.whatsapp_number,
          a.city,
          a.state,
          a.gst_no,
          a.pan_no,
          a.opening_gold_fine,
          a.opening_silver_fine,
          a.opening_cash,
          a.opening_anamat,
          a.opening_bank,
          a.active,
          a.created_at,
          a.updated_at
        FROM accounts a
        INNER JOIN account_groups ag ON ag.id = a.account_group_id
        WHERE a.deleted_at IS NULL
        ORDER BY a.account_name ASC
      `
      )
      .all() as AccountRow[]

    return rows.map(mapRow)
  },

  create(payload: AccountPayload) {
    const data = accountSchema.parse(payload)
    const db = getDatabase()

    assertAccountGroupExists(data.accountGroupId)

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM accounts
        WHERE LOWER(account_name) = LOWER(?)
        AND deleted_at IS NULL
      `
      )
      .get(data.accountName)

    if (duplicate) {
      throw new Error('Account already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    db.prepare(
      `
      INSERT INTO accounts (
        id,
        account_name,
        other_name,
        account_group_id,
        mobile_number,
        whatsapp_number,
        city,
        state,
        gst_no,
        pan_no,
        opening_gold_fine,
        opening_silver_fine,
        opening_cash,
        opening_anamat,
        opening_bank,
        active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      data.accountName,
      data.otherName,
      data.accountGroupId,
      data.mobileNumber,
      data.whatsappNumber,
      data.city,
      data.state,
      data.gstNo,
      data.panNo,
      data.openingGoldFine,
      data.openingSilverFine,
      data.openingCash,
      data.openingAnamat,
      data.openingBank,
      data.active ? 1 : 0,
      now,
      now
    )

    return this.getById(id)
  },

  update(id: string, payload: AccountPayload) {
    const data = accountSchema.parse(payload)
    const db = getDatabase()

    const existing = db
      .prepare(
        `
        SELECT id
        FROM accounts
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id)

    if (!existing) {
      throw new Error('Account not found')
    }

    assertAccountGroupExists(data.accountGroupId)

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM accounts
        WHERE LOWER(account_name) = LOWER(?)
        AND id != ?
        AND deleted_at IS NULL
      `
      )
      .get(data.accountName, id)

    if (duplicate) {
      throw new Error('Another account with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE accounts
      SET
        account_name = ?,
        other_name = ?,
        account_group_id = ?,
        mobile_number = ?,
        whatsapp_number = ?,
        city = ?,
        state = ?,
        gst_no = ?,
        pan_no = ?,
        opening_gold_fine = ?,
        opening_silver_fine = ?,
        opening_cash = ?,
        opening_anamat = ?,
        opening_bank = ?,
        active = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(
      data.accountName,
      data.otherName,
      data.accountGroupId,
      data.mobileNumber,
      data.whatsappNumber,
      data.city,
      data.state,
      data.gstNo,
      data.panNo,
      data.openingGoldFine,
      data.openingSilverFine,
      data.openingCash,
      data.openingAnamat,
      data.openingBank,
      data.active ? 1 : 0,
      now,
      id
    )

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE accounts
      SET deleted_at = ?, updated_at = ?
      WHERE id = ?
      AND deleted_at IS NULL
    `
    ).run(now, now, id)

    return { success: true }
  },

  getById(id: string) {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT
          a.id,
          a.account_name,
          a.other_name,
          a.account_group_id,
          ag.group_name,
          ag.group_type,
          a.mobile_number,
          a.whatsapp_number,
          a.city,
          a.state,
          a.gst_no,
          a.pan_no,
          a.opening_gold_fine,
          a.opening_silver_fine,
          a.opening_cash,
          a.opening_anamat,
          a.opening_bank,
          a.active,
          a.created_at,
          a.updated_at
        FROM accounts a
        INNER JOIN account_groups ag ON ag.id = a.account_group_id
        WHERE a.id = ?
        AND a.deleted_at IS NULL
      `
      )
      .get(id) as AccountRow | undefined

    if (!row) {
      throw new Error('Account not found')
    }

    return mapRow(row)
  }
}
