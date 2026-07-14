import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const saudaSchema = z.object({
  saudaDate: z.string().trim().min(1, 'Sauda date is required'),
  accountId: z.string().trim().min(1, 'Account is required'),
  metalType: z.enum(['Gold', 'Silver']).default('Gold'),
  transactionType: z.enum(['BUY', 'SELL']).default('BUY'),
  fine: z.coerce.number().positive('Fine must be greater than 0'),
  rate: z.coerce.number().positive('Rate must be greater than 0'),
  deliveryDate: z.string().trim().optional().default(''),
  narration: z.string().trim().optional().default('')
})

type SaudaPayload = z.infer<typeof saudaSchema>

type SaudaRow = {
  id: string
  sauda_no: string
  sauda_date: string
  account_id: string
  account_name: string
  metal_type: string
  transaction_type: string
  fine: number
  rate: number
  amount: number
  delivery_date: string | null
  status: string
  narration: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: SaudaRow) {
  return {
    id: row.id,
    saudaNo: row.sauda_no,
    saudaDate: row.sauda_date,
    accountId: row.account_id,
    accountName: row.account_name,
    metalType: row.metal_type,
    transactionType: row.transaction_type,
    fine: Number(row.fine ?? 0),
    rate: Number(row.rate ?? 0),
    amount: Number(row.amount ?? 0),
    deliveryDate: row.delivery_date ?? '',
    status: row.status,
    narration: row.narration ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function assertAccountExists(accountId: string): void {
  const db = getDatabase()
  const account = db
    .prepare(`SELECT id FROM accounts WHERE id = ? AND deleted_at IS NULL`)
    .get(accountId)

  if (!account) throw new Error('Account not found')
}

function getNextSaudaNo(): string {
  const db = getDatabase()
  const rows = db
    .prepare(`SELECT sauda_no FROM sauda_entries ORDER BY created_at DESC`)
    .all() as { sauda_no: string }[]

  const maxNumber = rows.reduce((max, row) => {
    const clean = String(row.sauda_no || '').replace('SD-', '')
    const parsed = Number(clean)
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max
  }, 0)

  return `SD-${String(maxNumber + 1).padStart(4, '0')}`
}

function getRowForMutation(id: string): { id: string; status: string } {
  const db = getDatabase()
  const row = db
    .prepare(`SELECT id, status FROM sauda_entries WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as { id: string; status: string } | undefined

  if (!row) throw new Error('Sauda entry not found')

  return row
}

export const saudaService = {
  getNextNumber() {
    return getNextSaudaNo()
  },

  create(payload: SaudaPayload) {
    const data = saudaSchema.parse(payload)
    assertAccountExists(data.accountId)

    const db = getDatabase()
    const id = uuidv4()
    const saudaNo = getNextSaudaNo()
    const amount = Math.round(data.fine * data.rate * 100) / 100
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `INSERT INTO sauda_entries (id, sauda_no, sauda_date, account_id, metal_type, transaction_type, fine, rate, amount, delivery_date, status, narration, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)`
    ).run(
      id,
      saudaNo,
      data.saudaDate,
      data.accountId,
      data.metalType,
      data.transactionType,
      data.fine,
      data.rate,
      amount,
      data.deliveryDate,
      data.narration,
      now,
      now
    )

    return this.getById(id)
  },

  update(id: string, payload: SaudaPayload) {
    const data = saudaSchema.parse(payload)
    assertAccountExists(data.accountId)
    getRowForMutation(id)

    const db = getDatabase()
    const amount = Math.round(data.fine * data.rate * 100) / 100
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `UPDATE sauda_entries
       SET sauda_date = ?, account_id = ?, metal_type = ?, transaction_type = ?, fine = ?, rate = ?, amount = ?, delivery_date = ?, narration = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`
    ).run(
      data.saudaDate,
      data.accountId,
      data.metalType,
      data.transactionType,
      data.fine,
      data.rate,
      amount,
      data.deliveryDate,
      data.narration,
      now,
      id
    )

    return this.getById(id)
  },

  list() {
    const db = getDatabase()
    const rows = db
      .prepare(
        `SELECT s.id, s.sauda_no, s.sauda_date, s.account_id, a.account_name, s.metal_type, s.transaction_type,
                s.fine, s.rate, s.amount, s.delivery_date, s.status, s.narration, s.created_at, s.updated_at
         FROM sauda_entries s
         INNER JOIN accounts a ON a.id = s.account_id
         WHERE s.deleted_at IS NULL
         ORDER BY s.sauda_date DESC, s.created_at DESC`
      )
      .all() as SaudaRow[]

    return rows.map(mapRow)
  },

  getById(id: string) {
    const db = getDatabase()
    const row = db
      .prepare(
        `SELECT s.id, s.sauda_no, s.sauda_date, s.account_id, a.account_name, s.metal_type, s.transaction_type,
                s.fine, s.rate, s.amount, s.delivery_date, s.status, s.narration, s.created_at, s.updated_at
         FROM sauda_entries s
         INNER JOIN accounts a ON a.id = s.account_id
         WHERE s.id = ? AND s.deleted_at IS NULL`
      )
      .get(id) as SaudaRow | undefined

    if (!row) throw new Error('Sauda entry not found')

    return mapRow(row)
  },

  closeSauda(id: string) {
    const row = getRowForMutation(id)

    if (row.status === 'CLOSED') {
      throw new Error('This sauda entry is already closed')
    }

    if (row.status === 'CANCELLED') {
      throw new Error('Cannot close a cancelled sauda entry')
    }

    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(`UPDATE sauda_entries SET status = 'CLOSED', updated_at = ? WHERE id = ?`).run(
      now,
      id
    )

    return this.getById(id)
  },

  delete(id: string) {
    getRowForMutation(id)

    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(`UPDATE sauda_entries SET deleted_at = ?, updated_at = ? WHERE id = ?`).run(
      now,
      now,
      id
    )

    return { success: true }
  }
}
