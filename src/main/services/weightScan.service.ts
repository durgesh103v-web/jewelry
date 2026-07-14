import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const weightScanSchema = z.object({
  scanDate: z.string().trim().min(1, 'Scan date is required'),
  barcode: z.string().trim().optional().default(''),
  itemId: z.string().trim().optional().default(''),
  grossWeight: z.coerce.number().default(0),
  netWeight: z.coerce.number().default(0),
  fine: z.coerce.number().default(0),
  narration: z.string().trim().optional().default('')
})

type WeightScanPayload = z.infer<typeof weightScanSchema>

type WeightScanRow = {
  id: string
  scan_date: string
  barcode: string | null
  item_id: string | null
  item_name: string | null
  gross_weight: number
  net_weight: number
  fine: number
  narration: string | null
  created_at: string
}

function mapRow(row: WeightScanRow) {
  return {
    id: row.id,
    scanDate: row.scan_date,
    barcode: row.barcode ?? '',
    itemId: row.item_id ?? '',
    itemName: row.item_name ?? '',
    grossWeight: Number(row.gross_weight ?? 0),
    netWeight: Number(row.net_weight ?? 0),
    fine: Number(row.fine ?? 0),
    narration: row.narration ?? '',
    createdAt: row.created_at
  }
}

function resolveItemId(itemId: string): string | null {
  if (!itemId.trim()) return null

  const db = getDatabase()
  const item = db
    .prepare(`SELECT id FROM items WHERE id = ? AND deleted_at IS NULL`)
    .get(itemId)

  if (!item) throw new Error('Item not found')

  return itemId
}

export const weightScanService = {
  create(payload: WeightScanPayload) {
    const data = weightScanSchema.parse(payload)
    const db = getDatabase()
    const itemId = resolveItemId(data.itemId)

    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `INSERT INTO weight_scan_logs (id, scan_date, barcode, item_id, gross_weight, net_weight, fine, narration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.scanDate,
      data.barcode,
      itemId,
      data.grossWeight,
      data.netWeight,
      data.fine,
      data.narration,
      now
    )

    return this.getById(id)
  },

  list() {
    const db = getDatabase()
    const rows = db
      .prepare(
        `SELECT w.id, w.scan_date, w.barcode, w.item_id, i.item_name, w.gross_weight, w.net_weight, w.fine, w.narration, w.created_at
         FROM weight_scan_logs w
         LEFT JOIN items i ON i.id = w.item_id
         ORDER BY w.scan_date DESC, w.created_at DESC`
      )
      .all() as WeightScanRow[]

    return rows.map(mapRow)
  },

  getById(id: string) {
    const db = getDatabase()
    const row = db
      .prepare(
        `SELECT w.id, w.scan_date, w.barcode, w.item_id, i.item_name, w.gross_weight, w.net_weight, w.fine, w.narration, w.created_at
         FROM weight_scan_logs w
         LEFT JOIN items i ON i.id = w.item_id
         WHERE w.id = ?`
      )
      .get(id) as WeightScanRow | undefined

    if (!row) throw new Error('Weight scan log not found')

    return mapRow(row)
  },

  delete(id: string) {
    const db = getDatabase()
    const existing = db.prepare(`SELECT id FROM weight_scan_logs WHERE id = ?`).get(id)

    if (!existing) throw new Error('Weight scan log not found')

    db.prepare(`DELETE FROM weight_scan_logs WHERE id = ?`).run(id)

    return { success: true }
  }
}
