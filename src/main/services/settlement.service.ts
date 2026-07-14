import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const settlementSchema = z.object({
  settlementDate: z.string().trim().min(1, 'Settlement date is required'),
  accountId: z.string().trim().min(1, 'Account is required'),
  metalType: z.enum(['Gold', 'Silver']).default('Gold'),
  goldFine: z.coerce.number().default(0),
  silverFine: z.coerce.number().default(0),
  cash: z.coerce.number().default(0),
  bank: z.coerce.number().default(0),
  anamat: z.coerce.number().default(0),
  narration: z.string().trim().optional().default('')
})

type SettlementPayload = z.infer<typeof settlementSchema>

type SettlementRow = {
  id: string
  settlement_no: string
  settlement_date: string
  account_id: string
  account_name: string
  metal_type: string
  gold_fine: number
  silver_fine: number
  cash: number
  bank: number
  anamat: number
  narration: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: SettlementRow) {
  return {
    id: row.id,
    settlementNo: row.settlement_no,
    settlementDate: row.settlement_date,
    accountId: row.account_id,
    accountName: row.account_name,
    metalType: row.metal_type,
    goldFine: Number(row.gold_fine ?? 0),
    silverFine: Number(row.silver_fine ?? 0),
    cash: Number(row.cash ?? 0),
    bank: Number(row.bank ?? 0),
    anamat: Number(row.anamat ?? 0),
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

function getNextSettlementNo(): string {
  const db = getDatabase()
  const rows = db
    .prepare(`SELECT settlement_no FROM settlements ORDER BY created_at DESC`)
    .all() as { settlement_no: string }[]

  const maxNumber = rows.reduce((max, row) => {
    const clean = String(row.settlement_no || '').replace('ST-', '')
    const parsed = Number(clean)
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max
  }, 0)

  return `ST-${String(maxNumber + 1).padStart(4, '0')}`
}

// A Settlement is a manual, single-account adjustment that always reduces
// what the party owes the firm - it posts a Jama (credit) entry, mirroring
// how cashVoucher's RECEIPT type posts *_jama for whichever components are
// non-zero.
function insertSettlementLedger(input: {
  settlementId: string
  settlementNo: string
  settlementDate: string
  accountId: string
  goldFine: number
  silverFine: number
  cash: number
  bank: number
  anamat: number
  narration: string
  createdAt: string
}): void {
  const db = getDatabase()
  const narration = input.narration || `Settlement ${input.settlementNo}`

  if (input.goldFine > 0) {
    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, metal_type, fine_jama, narration, created_at)
       VALUES (?, 'SETTLEMENT', ?, ?, ?, 'Gold', ?, ?, ?)`
    ).run(
      uuidv4(),
      input.settlementId,
      input.settlementDate,
      input.accountId,
      input.goldFine,
      narration,
      input.createdAt
    )
  }

  if (input.silverFine > 0) {
    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, metal_type, fine_jama, narration, created_at)
       VALUES (?, 'SETTLEMENT', ?, ?, ?, 'Silver', ?, ?, ?)`
    ).run(
      uuidv4(),
      input.settlementId,
      input.settlementDate,
      input.accountId,
      input.silverFine,
      narration,
      input.createdAt
    )
  }

  if (input.cash > 0) {
    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, cash_jama, narration, created_at)
       VALUES (?, 'SETTLEMENT', ?, ?, ?, ?, ?, ?)`
    ).run(
      uuidv4(),
      input.settlementId,
      input.settlementDate,
      input.accountId,
      input.cash,
      narration,
      input.createdAt
    )
  }

  if (input.bank > 0) {
    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, bank_jama, narration, created_at)
       VALUES (?, 'SETTLEMENT', ?, ?, ?, ?, ?, ?)`
    ).run(
      uuidv4(),
      input.settlementId,
      input.settlementDate,
      input.accountId,
      input.bank,
      narration,
      input.createdAt
    )
  }

  if (input.anamat > 0) {
    db.prepare(
      `INSERT INTO account_ledger (id, source_type, source_id, entry_date, account_id, anamat_jama, narration, created_at)
       VALUES (?, 'SETTLEMENT', ?, ?, ?, ?, ?, ?)`
    ).run(
      uuidv4(),
      input.settlementId,
      input.settlementDate,
      input.accountId,
      input.anamat,
      narration,
      input.createdAt
    )
  }
}

export const settlementService = {
  getNextNumber() {
    return getNextSettlementNo()
  },

  create(payload: SettlementPayload) {
    const data = settlementSchema.parse(payload)

    const total = data.goldFine + data.silverFine + data.cash + data.bank + data.anamat

    if (total <= 0) {
      throw new Error('Enter at least one settlement amount')
    }

    assertAccountExists(data.accountId)

    const db = getDatabase()
    const id = uuidv4()
    const settlementNo = getNextSettlementNo()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.transaction(() => {
      db.prepare(
        `INSERT INTO settlements (id, settlement_no, settlement_date, account_id, metal_type, gold_fine, silver_fine, cash, bank, anamat, narration, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        settlementNo,
        data.settlementDate,
        data.accountId,
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

      insertSettlementLedger({
        settlementId: id,
        settlementNo,
        settlementDate: data.settlementDate,
        accountId: data.accountId,
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
    const rows = db
      .prepare(
        `SELECT s.id, s.settlement_no, s.settlement_date, s.account_id, a.account_name, s.metal_type,
                s.gold_fine, s.silver_fine, s.cash, s.bank, s.anamat, s.narration, s.created_at, s.updated_at
         FROM settlements s
         INNER JOIN accounts a ON a.id = s.account_id
         WHERE s.deleted_at IS NULL
         ORDER BY s.settlement_date DESC, s.created_at DESC`
      )
      .all() as SettlementRow[]

    return rows.map(mapRow)
  },

  getById(id: string) {
    const db = getDatabase()
    const row = db
      .prepare(
        `SELECT s.id, s.settlement_no, s.settlement_date, s.account_id, a.account_name, s.metal_type,
                s.gold_fine, s.silver_fine, s.cash, s.bank, s.anamat, s.narration, s.created_at, s.updated_at
         FROM settlements s
         INNER JOIN accounts a ON a.id = s.account_id
         WHERE s.id = ? AND s.deleted_at IS NULL`
      )
      .get(id) as SettlementRow | undefined

    if (!row) throw new Error('Settlement not found')

    return mapRow(row)
  },

  delete(id: string) {
    const db = getDatabase()
    const existing = db
      .prepare(`SELECT id FROM settlements WHERE id = ? AND deleted_at IS NULL`)
      .get(id)

    if (!existing) throw new Error('Settlement not found')

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.transaction(() => {
      db.prepare(`UPDATE settlements SET deleted_at = ?, updated_at = ? WHERE id = ?`).run(
        now,
        now,
        id
      )
      db.prepare(`DELETE FROM account_ledger WHERE source_id = ? AND source_type = 'SETTLEMENT'`).run(
        id
      )
    })()

    return { success: true }
  }
}
