import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import {
  calculateHishob,
  calculateFineFromHishob,
  calculateMajuri,
  roundNumber,
  type LabourRateType
} from './jewelleryFormula.service'
import { jobWorkNumberService } from './jobWorkNumber.service'

// A job work order is closed out ("received") once the cumulative net weight
// received back across all receipts reaches this fraction of the net weight
// originally given to the karigar. Crafting always loses a bit of metal
// (filing / melting loss) which is compensated financially through wastage
// (added to tunch) rather than returned as physical weight, so requiring
// 100% weight coverage would leave almost every order stuck at
// "partial_received" forever. 90% is a practical tolerance for that loss;
// anything below it is treated as a genuine partial delivery.
const RECEIVED_COVERAGE_THRESHOLD = 0.9

const jobWorkOrderSchema = z.object({
  orderNo: z.string().trim().optional().default(''),
  orderDate: z.string().trim().optional().default(''),
  karigarAccountId: z.string().trim().min(1, 'Karigar account is required'),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']).default('Silver'),
  itemId: z.string().trim().min(1, 'Item is required'),
  grossWeightGiven: z.coerce.number().default(0),
  netWeightGiven: z.coerce.number().default(0),
  narration: z.string().trim().optional().default('')
})

type JobWorkOrderPayload = z.infer<typeof jobWorkOrderSchema>

const jobWorkReceiptSchema = z.object({
  receiptDate: z.string().trim().optional().default(''),
  pcs: z.coerce.number().default(0),
  grossWeightReceived: z.coerce.number().default(0),
  netWeightReceived: z.coerce.number().default(0),
  tunch: z.coerce.number().default(0),
  wastage: z.coerce.number().default(0),
  labourRate: z.coerce.number().default(0),
  labourRateType: z.enum(['Kg', 'Gm', 'Pcs']).default('Kg'),
  narration: z.string().trim().optional().default('')
})

type JobWorkReceiptPayload = z.infer<typeof jobWorkReceiptSchema>

type AccountRow = {
  id: string
}

type ItemRow = {
  id: string
  item_name: string
}

type JobWorkOrderRow = {
  id: string
  order_no: string
  order_date: string
  karigar_account_id: string
  metal_type: string
  item_id: string
  gross_weight_given: number
  net_weight_given: number
  narration: string
  status: 'pending' | 'partial_received' | 'received' | 'cancelled'
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
    throw new Error('Karigar account not found')
  }
}

function getItem(itemId: string): ItemRow {
  const db = getDatabase()

  const item = db
    .prepare(
      `
      SELECT id, item_name
      FROM items
      WHERE id = ?
      AND deleted_at IS NULL
    `
    )
    .get(itemId) as ItemRow | undefined

  if (!item) {
    throw new Error('Item not found')
  }

  return item
}

function getOrderHeaderRow(id: string): Record<string, unknown> | undefined {
  const db = getDatabase()

  return db
    .prepare(
      `
      SELECT
        jwo.*,
        a.account_name AS karigar_name,
        a.mobile_number AS karigar_mobile,
        i.item_name AS item_name,
        COALESCE(SUM(jwrl.net_weight_received), 0) AS total_net_weight_received,
        COALESCE(SUM(jwrl.fine_received), 0) AS total_fine_received,
        COALESCE(SUM(jwrl.majuri), 0) AS total_majuri
      FROM job_work_orders jwo
      INNER JOIN accounts a ON a.id = jwo.karigar_account_id
      INNER JOIN items i ON i.id = jwo.item_id
      LEFT JOIN job_work_receipt_lines jwrl ON jwrl.job_work_order_id = jwo.id
      WHERE jwo.id = ?
      AND jwo.deleted_at IS NULL
      GROUP BY jwo.id
    `
    )
    .get(id) as Record<string, unknown> | undefined
}

function getOrderForMutation(id: string): JobWorkOrderRow {
  const db = getDatabase()

  const order = db
    .prepare(
      `
      SELECT *
      FROM job_work_orders
      WHERE id = ?
      AND deleted_at IS NULL
    `
    )
    .get(id) as JobWorkOrderRow | undefined

  if (!order) {
    throw new Error('Job work order not found')
  }

  return order
}

export const jobWorkService = {
  getNextJobWorkNo() {
    return jobWorkNumberService.getNextJobWorkNo()
  },

  create(payload: JobWorkOrderPayload) {
    const data = jobWorkOrderSchema.parse(payload)
    const db = getDatabase()

    assertAccountExists(data.karigarAccountId)
    getItem(data.itemId)

    const orderId = uuidv4()
    const orderNo = data.orderNo || jobWorkNumberService.getNextJobWorkNo()
    const orderDate = data.orderDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    // Job Work OUT is only a tracking entry - material leaving to a karigar
    // is neither a sale nor a purchase, so it posts no stock_ledger or
    // account_ledger effect. Those effects only happen on receiveGoods().
    db.prepare(
      `
      INSERT INTO job_work_orders (
        id,
        order_no,
        order_date,
        karigar_account_id,
        metal_type,
        item_id,
        gross_weight_given,
        net_weight_given,
        narration,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      orderId,
      orderNo,
      orderDate,
      data.karigarAccountId,
      data.metalType,
      data.itemId,
      data.grossWeightGiven,
      data.netWeightGiven,
      data.narration,
      'pending',
      now,
      now
    )

    return this.getById(orderId)
  },

  update(id: string, payload: JobWorkOrderPayload) {
    const data = jobWorkOrderSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = getOrderForMutation(id)

    if (existing.status !== 'pending') {
      throw new Error('Only a pending job work order can be edited')
    }

    assertAccountExists(data.karigarAccountId)
    getItem(data.itemId)

    const orderDate = data.orderDate || dayjs().format('YYYY-MM-DD')

    db.prepare(
      `
      UPDATE job_work_orders
      SET
        order_date = ?,
        karigar_account_id = ?,
        metal_type = ?,
        item_id = ?,
        gross_weight_given = ?,
        net_weight_given = ?,
        narration = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(
      orderDate,
      data.karigarAccountId,
      data.metalType,
      data.itemId,
      data.grossWeightGiven,
      data.netWeightGiven,
      data.narration,
      now,
      id
    )

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const order = getOrderForMutation(id)

    if (order.status !== 'pending') {
      throw new Error('Only a pending job work order can be deleted')
    }

    db.prepare(
      `
      UPDATE job_work_orders
      SET
        deleted_at = ?,
        updated_at = ?,
        narration = TRIM(COALESCE(narration, '') || ?)
      WHERE id = ?
    `
    ).run(now, now, ` Voided on ${now}`, id)

    return {
      success: true,
      orderNo: order.order_no
    }
  },

  list() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          jwo.id,
          jwo.order_no,
          jwo.order_date,
          jwo.metal_type,
          jwo.gross_weight_given,
          jwo.net_weight_given,
          jwo.status,
          jwo.narration,
          a.account_name AS karigar_name,
          a.mobile_number AS karigar_mobile,
          i.item_name AS item_name,
          COALESCE(SUM(jwrl.net_weight_received), 0) AS total_net_weight_received,
          COALESCE(SUM(jwrl.fine_received), 0) AS total_fine_received,
          COALESCE(SUM(jwrl.majuri), 0) AS total_majuri
        FROM job_work_orders jwo
        INNER JOIN accounts a ON a.id = jwo.karigar_account_id
        INNER JOIN items i ON i.id = jwo.item_id
        LEFT JOIN job_work_receipt_lines jwrl ON jwrl.job_work_order_id = jwo.id
        WHERE jwo.deleted_at IS NULL
        GROUP BY jwo.id
        ORDER BY jwo.order_date DESC, jwo.created_at DESC
      `
      )
      .all()
  },

  getById(id: string) {
    const db = getDatabase()

    const header = getOrderHeaderRow(id)

    if (!header) {
      throw new Error('Job work order not found')
    }

    const receiptLines = db
      .prepare(
        `
        SELECT *
        FROM job_work_receipt_lines
        WHERE job_work_order_id = ?
        ORDER BY receipt_date ASC, created_at ASC
      `
      )
      .all(id)

    return {
      header,
      receiptLines
    }
  },

  receiveGoods(orderId: string, payload: JobWorkReceiptPayload) {
    const data = jobWorkReceiptSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const order = getOrderForMutation(orderId)

    if (order.status === 'received') {
      throw new Error('This job work order has already been fully received')
    }

    if (order.status === 'cancelled') {
      throw new Error('Cannot receive goods against a cancelled job work order')
    }

    const item = getItem(order.item_id)

    const receiptDate = data.receiptDate || dayjs().format('YYYY-MM-DD')
    const labourRateType = data.labourRateType as LabourRateType

    const hishob = calculateHishob(data.tunch, data.wastage)
    const fineReceived = calculateFineFromHishob(data.netWeightReceived, hishob)
    const majuri = calculateMajuri({
      netWeight: data.netWeightReceived,
      pcs: data.pcs,
      labourRate: data.labourRate,
      labourRateType
    })

    // weight_loss reflects how much lighter (or, if negative, heavier) this
    // receipt came back versus the full quantity originally given out. For
    // an order received in a single receipt this is the true crafting loss.
    // For an order closed over multiple partial receipts this number is
    // only meaningful once the order is fully received - earlier partial
    // receipts do not attempt to apportion the given weight across receipts
    // since job_work_orders does not track a per-receipt allocation.
    const weightLoss = roundNumber(order.net_weight_given - data.netWeightReceived)

    const receiptId = uuidv4()

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO job_work_receipt_lines (
          id,
          job_work_order_id,
          receipt_date,
          pcs,
          gross_weight_received,
          net_weight_received,
          tunch,
          wastage,
          hishob,
          fine_received,
          weight_loss,
          labour_rate,
          labour_rate_type,
          majuri,
          narration,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        receiptId,
        orderId,
        receiptDate,
        data.pcs,
        data.grossWeightReceived,
        data.netWeightReceived,
        data.tunch,
        data.wastage,
        hishob,
        fineReceived,
        weightLoss,
        data.labourRate,
        labourRateType,
        majuri,
        data.narration,
        now
      )

      // Finished goods are now physically back in the firm's stock - post a
      // Stock+ entry for the received item. The raw material sent out on
      // the OUT order was never removed from stock_ledger (see create()
      // above), so this is a pure addition, not a reversal.
      db.prepare(
        `
        INSERT INTO stock_ledger (
          id,
          source_type,
          source_id,
          entry_date,
          item_id,
          stamp_id,
          design_id,
          metal_type,
          pcs_delta,
          gross_weight_delta,
          net_weight_delta,
          fine_delta,
          narration,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        uuidv4(),
        'JOB_WORK_RECEIPT',
        orderId,
        receiptDate,
        order.item_id,
        null,
        null,
        order.metal_type,
        data.pcs,
        data.grossWeightReceived,
        data.netWeightReceived,
        fineReceived,
        `Job Work Receipt ${order.order_no} - ${item.item_name}`,
        now
      )

      // Majuri is cash the firm now owes the karigar for the crafting work,
      // exactly like the majuri component of a Purchase bill (see
      // purchase.service.ts, which posts item majuri as cash_jama on the
      // supplier's account). Per the account_ledger sign convention used
      // throughout this codebase (accountBalance.service.ts: balance =
      // opening + nave - jama), posting to JAMA lowers the karigar's
      // running balance, correctly reflecting a payable (the firm owes the
      // karigar). Posting to NAVE would instead show the karigar owing the
      // firm, which is backwards for a labour charge - so JAMA is used here
      // instead of NAVE.
      if (majuri !== 0) {
        db.prepare(
          `
          INSERT INTO account_ledger (
            id,
            source_type,
            source_id,
            entry_date,
            account_id,
            metal_type,
            cash_jama,
            narration,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          uuidv4(),
          'JOB_WORK_RECEIPT',
          orderId,
          receiptDate,
          order.karigar_account_id,
          order.metal_type,
          majuri,
          `Job Work Receipt against ${order.order_no} - Majuri`,
          now
        )
      }

      const totalReceivedRow = db
        .prepare(
          `
          SELECT COALESCE(SUM(net_weight_received), 0) AS total
          FROM job_work_receipt_lines
          WHERE job_work_order_id = ?
        `
        )
        .get(orderId) as { total: number }

      const totalReceived = Number(totalReceivedRow.total ?? 0)
      const coverage =
        order.net_weight_given > 0 ? totalReceived / order.net_weight_given : 1

      const nextStatus = coverage >= RECEIVED_COVERAGE_THRESHOLD ? 'received' : 'partial_received'

      db.prepare(
        `
        UPDATE job_work_orders
        SET
          status = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(nextStatus, now, orderId)
    })

    transaction()

    return this.getById(orderId)
  }
}
