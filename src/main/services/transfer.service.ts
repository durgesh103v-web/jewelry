import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const transferSchema = z.object({
  transferDate: z.string().trim().min(1, 'Transfer date is required'),
  fromAccountId: z.string().trim().min(1, 'From account is required'),
  toAccountId: z.string().trim().min(1, 'To account is required'),
  metalType: z.string().trim().optional().default(''),
  goldFine: z.coerce.number().default(0),
  silverFine: z.coerce.number().default(0),
  cash: z.coerce.number().default(0),
  bank: z.coerce.number().default(0),
  anamat: z.coerce.number().default(0),
  narration: z.string().trim().optional().default('')
})

type TransferPayload = z.infer<typeof transferSchema>

function assertAccountExists(accountId: string): void {
  const db = getDatabase()
  const account = db
    .prepare(`SELECT id FROM accounts WHERE id = ? AND deleted_at IS NULL`)
    .get(accountId)

  if (!account) throw new Error('Account not found')
}

function getNextTransferNo(): string {
  const db = getDatabase()
  const rows = db
    .prepare(`SELECT transfer_no FROM transfers ORDER BY created_at DESC`)
    .all() as { transfer_no: string }[]

  const maxNumber = rows.reduce((max, row) => {
    const clean = String(row.transfer_no || '').replace('TR-', '')
    const parsed = Number(clean)
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max
  }, 0)

  return `TR-${String(maxNumber + 1).padStart(4, '0')}`
}

function insertLedgerPair(input: {
  transferId: string
  transferNo: string
  transferDate: string
  fromAccountId: string
  toAccountId: string
  metalType: string
  goldFine: number
  silverFine: number
  cash: number
  bank: number
  anamat: number
  narration: string
  createdAt: string
}): void {
  const db = getDatabase()
  const narration = input.narration || `Transfer ${input.transferNo}`

  if (input.goldFine > 0) {
    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, metal_type, fine_nave, narration, created_at)
       VALUES (?, 'TRANSFER_OUT', ?, ?, ?, 'Gold', ?, ?, ?)`
    ).run(uuidv4(), input.transferId, input.transferDate, input.fromAccountId, input.goldFine, narration, input.createdAt)

    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, metal_type, fine_jama, narration, created_at)
       VALUES (?, 'TRANSFER_IN', ?, ?, ?, 'Gold', ?, ?, ?)`
    ).run(uuidv4(), input.transferId, input.transferDate, input.toAccountId, input.goldFine, narration, input.createdAt)
  }

  if (input.silverFine > 0) {
    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, metal_type, fine_nave, narration, created_at)
       VALUES (?, 'TRANSFER_OUT', ?, ?, ?, 'Silver', ?, ?, ?)`
    ).run(uuidv4(), input.transferId, input.transferDate, input.fromAccountId, input.silverFine, narration, input.createdAt)

    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, metal_type, fine_jama, narration, created_at)
       VALUES (?, 'TRANSFER_IN', ?, ?, ?, 'Silver', ?, ?, ?)`
    ).run(uuidv4(), input.transferId, input.transferDate, input.toAccountId, input.silverFine, narration, input.createdAt)
  }

  if (input.cash > 0) {
    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, cash_nave, narration, created_at)
       VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), input.transferId, input.transferDate, input.fromAccountId, input.cash, narration, input.createdAt)

    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, cash_jama, narration, created_at)
       VALUES (?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), input.transferId, input.transferDate, input.toAccountId, input.cash, narration, input.createdAt)
  }

  if (input.bank > 0) {
    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, bank_nave, narration, created_at)
       VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), input.transferId, input.transferDate, input.fromAccountId, input.bank, narration, input.createdAt)

    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, bank_jama, narration, created_at)
       VALUES (?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), input.transferId, input.transferDate, input.toAccountId, input.bank, narration, input.createdAt)
  }

  if (input.anamat > 0) {
    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, anamat_nave, narration, created_at)
       VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), input.transferId, input.transferDate, input.fromAccountId, input.anamat, narration, input.createdAt)

    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, anamat_jama, narration, created_at)
       VALUES (?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), input.transferId, input.transferDate, input.toAccountId, input.anamat, narration, input.createdAt)
  }
}

export const transferService = {
  getNextNumber() {
    return getNextTransferNo()
  },

  create(payload: TransferPayload) {
    const data = transferSchema.parse(payload)

    if (data.fromAccountId === data.toAccountId) {
      throw new Error('From and To accounts must be different')
    }

    const total =
      data.goldFine + data.silverFine + data.cash + data.bank + data.anamat

    if (total <= 0) {
      throw new Error('Enter at least one transfer amount')
    }

    assertAccountExists(data.fromAccountId)
    assertAccountExists(data.toAccountId)

    const db = getDatabase()
    const id = uuidv4()
    const transferNo = getNextTransferNo()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.transaction(() => {
      db.prepare(
        `INSERT INTO transfers (id, transfer_no, transfer_date, from_account_id, to_account_id, metal_type, gold_fine, silver_fine, cash, bank, anamat, narration, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        transferNo,
        data.transferDate,
        data.fromAccountId,
        data.toAccountId,
        data.metalType,
        data.goldFine,
        data.silverFine,
        data.cash,
        data.bank,
        data.anamat,
        data.narration,
        now,
        now
      )

      insertLedgerPair({
        transferId: id,
        transferNo,
        transferDate: data.transferDate,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        metalType: data.metalType,
        goldFine: data.goldFine,
        silverFine: data.silverFine,
        cash: data.cash,
        bank: data.bank,
        anamat: data.anamat,
        narration: data.narration,
        createdAt: now
      })
    })()

    return this.getById(id)
  },

  list() {
    const db = getDatabase()
    return db
      .prepare(
        `SELECT t.id, t.transfer_no AS transferNo, t.transfer_date AS transferDate,
                fa.account_name AS fromAccountName, ta.account_name AS toAccountName,
                t.metal_type AS metalType, t.gold_fine AS goldFine, t.silver_fine AS silverFine,
                t.cash, t.bank, t.anamat, t.narration, t.created_at AS createdAt
         FROM transfers t
         INNER JOIN accounts fa ON fa.id = t.from_account_id
         INNER JOIN accounts ta ON ta.id = t.to_account_id
         WHERE t.deleted_at IS NULL
         ORDER BY t.transfer_date DESC, t.created_at DESC`
      )
      .all()
  },

  getById(id: string) {
    const db = getDatabase()
    const row = db
      .prepare(
        `SELECT t.id, t.transfer_no AS transferNo, t.transfer_date AS transferDate,
                t.from_account_id AS fromAccountId, fa.account_name AS fromAccountName,
                t.to_account_id AS toAccountId, ta.account_name AS toAccountName,
                t.metal_type AS metalType, t.gold_fine AS goldFine, t.silver_fine AS silverFine,
                t.cash, t.bank, t.anamat, t.narration, t.created_at AS createdAt
         FROM transfers t
         INNER JOIN accounts fa ON fa.id = t.from_account_id
         INNER JOIN accounts ta ON ta.id = t.to_account_id
         WHERE t.id = ? AND t.deleted_at IS NULL`
      )
      .get(id)

    if (!row) throw new Error('Transfer not found')
    return row
  },

  delete(id: string) {
    const db = getDatabase()
    const existing = db
      .prepare(`SELECT id FROM transfers WHERE id = ? AND deleted_at IS NULL`)
      .get(id)

    if (!existing) throw new Error('Transfer not found')

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.transaction(() => {
      db.prepare(`UPDATE transfers SET deleted_at = ?, updated_at = ? WHERE id = ?`).run(now, now, id)
      db.prepare(`DELETE FROM account_ledger WHERE source_id = ? AND source_type IN ('TRANSFER_IN', 'TRANSFER_OUT')`).run(id)
    })()

    return { success: true }
  }
}
