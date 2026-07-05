import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import type {
  CashVoucher,
  CashVoucherFilter,
  CashVoucherPayload,
  CashVoucherType
} from '../../shared/types/cashVoucher'

type RawCashVoucherPayload = CashVoucherPayload & {
  id?: string
  voucher_type?: CashVoucherType
  voucher_date?: string
  account_id?: string
}

type RawCashVoucherFilter = CashVoucherFilter & {
  voucher_type?: CashVoucherType | 'ALL'
  account_id?: string
}

type CashVoucherRow = {
  id: string
  voucher_type: CashVoucherType
  voucher_no: string
  voucher_date: string
  account_id: string
  account_name: string | null
  amount: number
  narration: string | null
  created_at: string
  updated_at: string
}

const cashVoucherSchema = z.object({
  voucherType: z.enum(['RECEIPT', 'PAYMENT']),
  voucherDate: z.string().trim().min(1, 'Voucher date is required'),
  accountId: z.string().trim().min(1, 'Account is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  narration: z.string().trim().optional().default('')
})

function normalizePayload(payload: RawCashVoucherPayload): CashVoucherPayload {
  return {
    voucherType: payload.voucherType ?? payload.voucher_type ?? 'RECEIPT',
    voucherDate: payload.voucherDate ?? payload.voucher_date ?? '',
    accountId: payload.accountId ?? payload.account_id ?? '',
    amount: payload.amount,
    narration: payload.narration ?? ''
  }
}

function normalizeFilter(filter: RawCashVoucherFilter = {}): CashVoucherFilter {
  return {
    fromDate: filter.fromDate,
    toDate: filter.toDate,
    voucherType: filter.voucherType ?? filter.voucher_type ?? 'ALL',
    accountId: filter.accountId ?? filter.account_id ?? ''
  }
}

function mapRow(row: CashVoucherRow): CashVoucher {
  return {
    id: row.id,
    voucherType: row.voucher_type,
    voucherNo: row.voucher_no,
    voucherDate: row.voucher_date,
    accountId: row.account_id,
    accountName: row.account_name ?? '',
    amount: Number(row.amount ?? 0),
    narration: row.narration ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function assertAccountExists(accountId: string): void {
  const db = getDatabase()
  const account = db
    .prepare(
      `
      SELECT id
      FROM accounts
      WHERE id = ?
      AND deleted_at IS NULL
    `
    )
    .get(accountId)

  if (!account) {
    throw new Error('Account not found')
  }
}

function getNextVoucherNo(voucherType: CashVoucherType): string {
  const db = getDatabase()
  const prefix = voucherType === 'RECEIPT' ? 'CR' : 'CP'

  const rows = db
    .prepare(
      `
      SELECT voucher_no
      FROM cash_vouchers
      WHERE voucher_type = ?
      ORDER BY created_at DESC
    `
    )
    .all(voucherType) as { voucher_no: string }[]

  const maxNumber = rows.reduce((max, row) => {
    const cleanVoucherNo = String(row.voucher_no || '').trim()
    const numberPart = cleanVoucherNo.startsWith(`${prefix}-`)
      ? cleanVoucherNo.replace(`${prefix}-`, '')
      : '0'
    const parsed = Number(numberPart)

    return Number.isFinite(parsed) ? Math.max(max, parsed) : max
  }, 0)

  return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`
}

function insertLedgerEntry(input: {
  voucherId: string
  voucherType: CashVoucherType
  voucherNo: string
  voucherDate: string
  accountId: string
  amount: number
  narration: string
  createdAt: string
}): void {
  const db = getDatabase()
  const sourceType = input.voucherType === 'RECEIPT' ? 'CASH_RECEIPT' : 'CASH_PAYMENT'
  const cashJama = input.voucherType === 'RECEIPT' ? input.amount : 0
  const cashNave = input.voucherType === 'PAYMENT' ? input.amount : 0
  const label = input.voucherType === 'RECEIPT' ? 'Cash Receipt' : 'Cash Payment'
  const narration = input.narration || `${label} ${input.voucherNo}`

  db.prepare(
    `
    INSERT INTO account_ledger (
      id,
      source_type,
      source_id,
      entry_date,
      account_id,
      cash_jama,
      cash_nave,
      narration,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    uuidv4(),
    sourceType,
    input.voucherId,
    input.voucherDate,
    input.accountId,
    cashJama,
    cashNave,
    narration,
    input.createdAt
  )
}

export const cashVoucherService = {
  getNextVoucherNo(voucherType: CashVoucherType) {
    return getNextVoucherNo(voucherType)
  },

  create(payload: RawCashVoucherPayload) {
    const data = cashVoucherSchema.parse(normalizePayload(payload))
    const db = getDatabase()

    assertAccountExists(data.accountId)

    const id = uuidv4()
    const voucherNo = getNextVoucherNo(data.voucherType)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO cash_vouchers (
          id,
          voucher_type,
          voucher_no,
          voucher_date,
          account_id,
          amount,
          narration,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        id,
        data.voucherType,
        voucherNo,
        data.voucherDate,
        data.accountId,
        data.amount,
        data.narration,
        now,
        now
      )

      insertLedgerEntry({
        voucherId: id,
        voucherType: data.voucherType,
        voucherNo,
        voucherDate: data.voucherDate,
        accountId: data.accountId,
        amount: data.amount,
        narration: data.narration,
        createdAt: now
      })
    })

    transaction()

    return this.getById(id)
  },

  update(id: string, payload: RawCashVoucherPayload) {
    const data = cashVoucherSchema.parse(normalizePayload(payload))
    const db = getDatabase()

    assertAccountExists(data.accountId)

    const existing = this.getById(id)
    const voucherNo =
      existing.voucherType === data.voucherType
        ? existing.voucherNo
        : getNextVoucherNo(data.voucherType)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE cash_vouchers
        SET
          voucher_type = ?,
          voucher_no = ?,
          voucher_date = ?,
          account_id = ?,
          amount = ?,
          narration = ?,
          updated_at = ?
        WHERE id = ?
        AND deleted_at IS NULL
      `
      ).run(
        data.voucherType,
        voucherNo,
        data.voucherDate,
        data.accountId,
        data.amount,
        data.narration,
        now,
        id
      )

      db.prepare(
        `
        DELETE FROM account_ledger
        WHERE source_type IN ('CASH_RECEIPT', 'CASH_PAYMENT')
        AND source_id = ?
      `
      ).run(id)

      insertLedgerEntry({
        voucherId: id,
        voucherType: data.voucherType,
        voucherNo,
        voucherDate: data.voucherDate,
        accountId: data.accountId,
        amount: data.amount,
        narration: data.narration,
        createdAt: now
      })
    })

    transaction()

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    this.getById(id)

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE cash_vouchers
        SET deleted_at = ?, updated_at = ?
        WHERE id = ?
        AND deleted_at IS NULL
      `
      ).run(now, now, id)

      db.prepare(
        `
        DELETE FROM account_ledger
        WHERE source_type IN ('CASH_RECEIPT', 'CASH_PAYMENT')
        AND source_id = ?
      `
      ).run(id)
    })

    transaction()

    return { success: true }
  },

  getById(id: string) {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT
          cv.id,
          cv.voucher_type,
          cv.voucher_no,
          cv.voucher_date,
          cv.account_id,
          a.account_name,
          cv.amount,
          cv.narration,
          cv.created_at,
          cv.updated_at
        FROM cash_vouchers cv
        INNER JOIN accounts a ON a.id = cv.account_id
        WHERE cv.id = ?
        AND cv.deleted_at IS NULL
      `
      )
      .get(id) as CashVoucherRow | undefined

    if (!row) {
      throw new Error('Cash voucher not found')
    }

    return mapRow(row)
  },

  list(filterPayload: RawCashVoucherFilter = {}) {
    const db = getDatabase()
    const filter = normalizeFilter(filterPayload)
    const conditions = ['cv.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter.fromDate) {
      conditions.push('cv.voucher_date >= ?')
      params.push(filter.fromDate)
    }

    if (filter.toDate) {
      conditions.push('cv.voucher_date <= ?')
      params.push(filter.toDate)
    }

    if (filter.voucherType && filter.voucherType !== 'ALL') {
      conditions.push('cv.voucher_type = ?')
      params.push(filter.voucherType)
    }

    if (filter.accountId) {
      conditions.push('cv.account_id = ?')
      params.push(filter.accountId)
    }

    const rows = db
      .prepare(
        `
        SELECT
          cv.id,
          cv.voucher_type,
          cv.voucher_no,
          cv.voucher_date,
          cv.account_id,
          a.account_name,
          cv.amount,
          cv.narration,
          cv.created_at,
          cv.updated_at
        FROM cash_vouchers cv
        INNER JOIN accounts a ON a.id = cv.account_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY cv.voucher_date DESC, cv.created_at DESC
      `
      )
      .all(...params) as CashVoucherRow[]

    return rows.map(mapRow)
  }
}
