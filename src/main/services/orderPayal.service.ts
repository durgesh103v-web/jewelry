import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const orderPayalSchema = z.object({
  orderDate: z.string().trim().min(1, 'Order date is required'),
  accountId: z.string().trim().min(1, 'Account is required'),
  itemId: z.string().trim().min(1, 'Item is required'),
  pcs: z.coerce.number().default(0),
  weight: z.coerce.number().default(0),
  deliveryDate: z.string().trim().optional().default(''),
  narration: z.string().trim().optional().default('')
})

type OrderPayalPayload = z.infer<typeof orderPayalSchema>

type OrderPayalRow = {
  id: string
  order_no: string
  order_date: string
  account_id: string
  account_name: string
  item_id: string
  item_name: string
  pcs: number
  weight: number
  delivery_date: string | null
  status: string
  narration: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: OrderPayalRow) {
  return {
    id: row.id,
    orderNo: row.order_no,
    orderDate: row.order_date,
    accountId: row.account_id,
    accountName: row.account_name,
    itemId: row.item_id,
    itemName: row.item_name,
    pcs: Number(row.pcs ?? 0),
    weight: Number(row.weight ?? 0),
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

function assertItemExists(itemId: string): void {
  const db = getDatabase()
  const item = db.prepare(`SELECT id FROM items WHERE id = ? AND deleted_at IS NULL`).get(itemId)

  if (!item) throw new Error('Item not found')
}

function getNextOrderNo(): string {
  const db = getDatabase()
  const rows = db
    .prepare(`SELECT order_no FROM order_payal ORDER BY created_at DESC`)
    .all() as { order_no: string }[]

  const maxNumber = rows.reduce((max, row) => {
    const clean = String(row.order_no || '').replace('OP-', '')
    const parsed = Number(clean)
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max
  }, 0)

  return `OP-${String(maxNumber + 1).padStart(4, '0')}`
}

function getRowForMutation(id: string): { id: string; status: string } {
  const db = getDatabase()
  const row = db
    .prepare(`SELECT id, status FROM order_payal WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as { id: string; status: string } | undefined

  if (!row) throw new Error('Order not found')

  return row
}

export const orderPayalService = {
  getNextNumber() {
    return getNextOrderNo()
  },

  create(payload: OrderPayalPayload) {
    const data = orderPayalSchema.parse(payload)
    assertAccountExists(data.accountId)
    assertItemExists(data.itemId)

    const db = getDatabase()
    const id = uuidv4()
    const orderNo = getNextOrderNo()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `INSERT INTO order_payal (id, order_no, order_date, account_id, item_id, pcs, weight, delivery_date, status, narration, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`
    ).run(
      id,
      orderNo,
      data.orderDate,
      data.accountId,
      data.itemId,
      data.pcs,
      data.weight,
      data.deliveryDate,
      data.narration,
      now,
      now
    )

    return this.getById(id)
  },

  update(id: string, payload: OrderPayalPayload) {
    const data = orderPayalSchema.parse(payload)
    assertAccountExists(data.accountId)
    assertItemExists(data.itemId)
    getRowForMutation(id)

    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `UPDATE order_payal
       SET order_date = ?, account_id = ?, item_id = ?, pcs = ?, weight = ?, delivery_date = ?, narration = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`
    ).run(
      data.orderDate,
      data.accountId,
      data.itemId,
      data.pcs,
      data.weight,
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
        `SELECT o.id, o.order_no, o.order_date, o.account_id, a.account_name, o.item_id, i.item_name,
                o.pcs, o.weight, o.delivery_date, o.status, o.narration, o.created_at, o.updated_at
         FROM order_payal o
         INNER JOIN accounts a ON a.id = o.account_id
         INNER JOIN items i ON i.id = o.item_id
         WHERE o.deleted_at IS NULL
         ORDER BY o.order_date DESC, o.created_at DESC`
      )
      .all() as OrderPayalRow[]

    return rows.map(mapRow)
  },

  getById(id: string) {
    const db = getDatabase()
    const row = db
      .prepare(
        `SELECT o.id, o.order_no, o.order_date, o.account_id, a.account_name, o.item_id, i.item_name,
                o.pcs, o.weight, o.delivery_date, o.status, o.narration, o.created_at, o.updated_at
         FROM order_payal o
         INNER JOIN accounts a ON a.id = o.account_id
         INNER JOIN items i ON i.id = o.item_id
         WHERE o.id = ? AND o.deleted_at IS NULL`
      )
      .get(id) as OrderPayalRow | undefined

    if (!row) throw new Error('Order not found')

    return mapRow(row)
  },

  markDelivered(id: string) {
    const row = getRowForMutation(id)

    if (row.status === 'DELIVERED') {
      throw new Error('This order has already been delivered')
    }

    if (row.status === 'CANCELLED') {
      throw new Error('Cannot deliver a cancelled order')
    }

    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(`UPDATE order_payal SET status = 'DELIVERED', updated_at = ? WHERE id = ?`).run(
      now,
      id
    )

    return this.getById(id)
  },

  delete(id: string) {
    getRowForMutation(id)

    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(`UPDATE order_payal SET deleted_at = ?, updated_at = ? WHERE id = ?`).run(
      now,
      now,
      id
    )

    return { success: true }
  }
}
