import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { repairEntryNumberService } from './repairEntryNumber.service'

const repairEntrySchema = z.object({
  repairNo: z.string().trim().optional().default(''),
  receiptDate: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  phone: z.string().trim().optional().default(''),
  itemDescription: z.string().trim().min(1, 'Item description is required'),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']).default('Silver'),
  approxWeight: z.coerce.number().default(0),
  workDescription: z.string().trim().optional().default(''),
  estimatedCharge: z.coerce.number().default(0),
  narration: z.string().trim().optional().default('')
})

type RepairEntryPayload = z.infer<typeof repairEntrySchema>

const completeRepairSchema = z.object({
  actualCharge: z.coerce.number().min(0, 'Actual charge must be 0 or more'),
  completedDate: z.string().trim().optional().default(''),
  narration: z.string().trim().optional().default('')
})

type CompleteRepairPayload = z.infer<typeof completeRepairSchema>

const markDeliveredSchema = z.object({
  deliveredDate: z.string().trim().optional().default('')
})

type MarkDeliveredPayload = z.infer<typeof markDeliveredSchema>

type AccountRow = {
  id: string
}

type RepairEntryRow = {
  id: string
  repair_no: string
  receipt_date: string
  account_id: string
  phone: string
  item_description: string
  metal_type: string
  approx_weight: number
  work_description: string
  estimated_charge: number
  actual_charge: number | null
  status: 'received' | 'completed' | 'delivered' | 'cancelled'
  completed_date: string | null
  delivered_date: string | null
  narration: string
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
    .get(accountId) as AccountRow | undefined

  if (!account) {
    throw new Error('Account not found')
  }
}

function getEntryRow(id: string): Record<string, unknown> | undefined {
  const db = getDatabase()

  return db
    .prepare(
      `
      SELECT
        re.*,
        a.account_name,
        a.mobile_number
      FROM repair_entries re
      INNER JOIN accounts a ON a.id = re.account_id
      WHERE re.id = ?
      AND re.deleted_at IS NULL
    `
    )
    .get(id) as Record<string, unknown> | undefined
}

function getEntryForMutation(id: string): RepairEntryRow {
  const db = getDatabase()

  const entry = db
    .prepare(
      `
      SELECT *
      FROM repair_entries
      WHERE id = ?
      AND deleted_at IS NULL
    `
    )
    .get(id) as RepairEntryRow | undefined

  if (!entry) {
    throw new Error('Repair entry not found')
  }

  return entry
}

export const repairEntryService = {
  getNextRepairNo() {
    return repairEntryNumberService.getNextRepairNo()
  },

  create(payload: RepairEntryPayload) {
    const data = repairEntrySchema.parse(payload)
    const db = getDatabase()

    assertAccountExists(data.accountId)

    const id = uuidv4()
    const repairNo = data.repairNo || repairEntryNumberService.getNextRepairNo()
    const receiptDate = data.receiptDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    // Receipt of the customer's own item is only a tracking entry - the
    // item stays the customer's property throughout, so it never enters
    // stock_ledger, and no money is owed yet (the repair charge is only
    // known / billed once the work is actually completed). So create()
    // posts no stock_ledger or account_ledger effect at all - see
    // completeRepair() below for the account_ledger posting.
    db.prepare(
      `
      INSERT INTO repair_entries (
        id,
        repair_no,
        receipt_date,
        account_id,
        phone,
        item_description,
        metal_type,
        approx_weight,
        work_description,
        estimated_charge,
        actual_charge,
        status,
        narration,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      repairNo,
      receiptDate,
      data.accountId,
      data.phone,
      data.itemDescription,
      data.metalType,
      data.approxWeight,
      data.workDescription,
      data.estimatedCharge,
      null,
      'received',
      data.narration,
      now,
      now
    )

    return this.getById(id)
  },

  update(id: string, payload: RepairEntryPayload) {
    const data = repairEntrySchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = getEntryForMutation(id)

    if (existing.status !== 'received') {
      throw new Error('Only a repair entry with status Received can be edited')
    }

    assertAccountExists(data.accountId)

    const receiptDate = data.receiptDate || dayjs().format('YYYY-MM-DD')

    db.prepare(
      `
      UPDATE repair_entries
      SET
        receipt_date = ?,
        account_id = ?,
        phone = ?,
        item_description = ?,
        metal_type = ?,
        approx_weight = ?,
        work_description = ?,
        estimated_charge = ?,
        narration = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(
      receiptDate,
      data.accountId,
      data.phone,
      data.itemDescription,
      data.metalType,
      data.approxWeight,
      data.workDescription,
      data.estimatedCharge,
      data.narration,
      now,
      id
    )

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const entry = getEntryForMutation(id)

    if (entry.status !== 'received') {
      throw new Error('Only a repair entry with status Received can be deleted')
    }

    db.prepare(
      `
      UPDATE repair_entries
      SET
        deleted_at = ?,
        updated_at = ?,
        narration = TRIM(COALESCE(narration, '') || ?)
      WHERE id = ?
    `
    ).run(now, now, ` Voided on ${now}`, id)

    return {
      success: true,
      repairNo: entry.repair_no
    }
  },

  list() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          re.id,
          re.repair_no,
          re.receipt_date,
          re.account_id,
          re.phone,
          re.item_description,
          re.metal_type,
          re.approx_weight,
          re.work_description,
          re.estimated_charge,
          re.actual_charge,
          re.status,
          re.completed_date,
          re.delivered_date,
          re.narration,
          a.account_name,
          a.mobile_number
        FROM repair_entries re
        INNER JOIN accounts a ON a.id = re.account_id
        WHERE re.deleted_at IS NULL
        ORDER BY re.receipt_date DESC, re.created_at DESC
      `
      )
      .all()
  },

  getById(id: string) {
    const entry = getEntryRow(id)

    if (!entry) {
      throw new Error('Repair entry not found')
    }

    return entry
  },

  completeRepair(id: string, payload: CompleteRepairPayload) {
    const data = completeRepairSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const entry = getEntryForMutation(id)

    if (entry.status === 'completed' || entry.status === 'delivered') {
      throw new Error('This repair entry has already been completed')
    }

    if (entry.status === 'cancelled') {
      throw new Error('Cannot complete a cancelled repair entry')
    }

    const completedDate = data.completedDate || dayjs().format('YYYY-MM-DD')
    const narration = data.narration
      ? [entry.narration, data.narration].filter(Boolean).join(' ').trim()
      : entry.narration

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE repair_entries
        SET
          status = 'completed',
          actual_charge = ?,
          completed_date = ?,
          narration = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(data.actualCharge, completedDate, narration, now, id)

      // The repair charge is cash the customer now owes the firm for the
      // labour performed on their own item - exactly like the majuri
      // component of a Sale (see sale.service.ts, which posts item majuri
      // as cash_nave on the customer's account). Per the account_ledger
      // sign convention used throughout this codebase
      // (accountBalance.service.ts: balance = opening + nave - jama),
      // posting to NAVE raises the customer's running balance, correctly
      // reflecting a receivable (the customer owes the firm). There is no
      // fine/weight component here since the repair charge is cash-only.
      db.prepare(
        `
        INSERT INTO account_ledger (
          id,
          source_type,
          source_id,
          entry_date,
          account_id,
          metal_type,
          cash_nave,
          narration,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        uuidv4(),
        'REPAIR_CHARGE',
        id,
        completedDate,
        entry.account_id,
        entry.metal_type,
        data.actualCharge,
        `Repair Charge ${entry.repair_no}`,
        now
      )
    })

    transaction()

    return this.getById(id)
  },

  markDelivered(id: string, payload: MarkDeliveredPayload) {
    const data = markDeliveredSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const entry = getEntryForMutation(id)

    if (entry.status === 'delivered') {
      throw new Error('This repair entry has already been delivered')
    }

    if (entry.status !== 'completed') {
      throw new Error('Only a completed repair entry can be marked delivered')
    }

    const deliveredDate = data.deliveredDate || dayjs().format('YYYY-MM-DD')

    // Delivery only marks that the customer physically collected the item
    // and settled up - the repair charge itself was already posted to
    // account_ledger at completeRepair(), so this step has no ledger
    // effect of its own.
    db.prepare(
      `
      UPDATE repair_entries
      SET
        status = 'delivered',
        delivered_date = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(deliveredDate, now, id)

    return this.getById(id)
  }
}
