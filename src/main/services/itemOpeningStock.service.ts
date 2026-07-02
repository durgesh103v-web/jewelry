import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { calculateFine, calculateNetWeight } from './jewelleryFormula.service'

const openingStockSchema = z.object({
  stockDate: z.string().trim().optional().default(''),
  itemId: z.string().trim().min(1, 'Item is required'),
  stampId: z.string().trim().optional().default(''),
  designId: z.string().trim().optional().default(''),
  barcode: z.string().trim().max(80).optional().default(''),
  remark: z.string().trim().max(255).optional().default(''),
  pcs: z.coerce.number().default(0),
  grossWeight: z.coerce.number().default(0),
  lessWeight: z.coerce.number().default(0),
  addWeight: z.coerce.number().default(0),
  tanch: z.coerce.number().default(0),
  wastage: z.coerce.number().default(0),
  hishob: z.coerce.number().default(0),
  unit: z.string().trim().optional().default('GM'),
  active: z.boolean().default(true)
})

type OpeningStockPayload = z.infer<typeof openingStockSchema>

type ItemMetaRow = {
  id: string
  metal_type: string
}

type OpeningStockRow = {
  id: string
  stock_date: string
  item_id: string
  item_name: string
  metal_type: string
  stamp_id: string | null
  stamp_name: string | null
  design_id: string | null
  design_name: string | null
  barcode: string | null
  remark: string | null
  pcs: number
  gross_weight: number
  less_weight: number
  add_weight: number
  net_weight: number
  tanch: number
  wastage: number
  hishob: number
  unit: string | null
  fine: number
  active: number
  created_at: string
  updated_at: string
}

type OpeningStockRecord = {
  id: string
  stockDate: string
  itemId: string
  itemName: string
  metalType: string
  stampId: string
  stampName: string
  designId: string
  designName: string
  barcode: string
  remark: string
  pcs: number
  grossWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  tanch: number
  wastage: number
  hishob: number
  unit: string
  fine: number
  active: boolean
  createdAt: string
  updatedAt: string
}

function emptyToNull(value: string): string | null {
  return value.trim() ? value.trim() : null
}

function mapRow(row: OpeningStockRow): OpeningStockRecord {
  return {
    id: row.id,
    stockDate: row.stock_date,
    itemId: row.item_id,
    itemName: row.item_name,
    metalType: row.metal_type,
    stampId: row.stamp_id ?? '',
    stampName: row.stamp_name ?? '',
    designId: row.design_id ?? '',
    designName: row.design_name ?? '',
    barcode: row.barcode ?? '',
    remark: row.remark ?? '',
    pcs: Number(row.pcs ?? 0),
    grossWeight: Number(row.gross_weight ?? 0),
    lessWeight: Number(row.less_weight ?? 0),
    addWeight: Number(row.add_weight ?? 0),
    netWeight: Number(row.net_weight ?? 0),
    tanch: Number(row.tanch ?? 0),
    wastage: Number(row.wastage ?? 0),
    hishob: Number(row.hishob ?? 0),
    unit: row.unit ?? 'GM',
    fine: Number(row.fine ?? 0),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function getItemMeta(itemId: string): ItemMetaRow {
  const db = getDatabase()

  const item = db
    .prepare(
      `
      SELECT id, metal_type
      FROM items
      WHERE id = ?
      AND deleted_at IS NULL
    `
    )
    .get(itemId) as ItemMetaRow | undefined

  if (!item) {
    throw new Error('Item not found')
  }

  return item
}

export const itemOpeningStockService = {
  list() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT
          os.id,
          os.stock_date,
          os.item_id,
          i.item_name,
          i.metal_type,
          os.stamp_id,
          ist.stamp_name,
          os.design_id,
          idg.design_name,
          os.barcode,
          os.remark,
          os.pcs,
          os.gross_weight,
          os.less_weight,
          os.add_weight,
          os.net_weight,
          os.tanch,
          os.wastage,
          os.hishob,
          os.unit,
          os.fine,
          os.active,
          os.created_at,
          os.updated_at
        FROM item_opening_stock os
        INNER JOIN items i ON i.id = os.item_id
        LEFT JOIN item_stamps ist ON ist.id = os.stamp_id
        LEFT JOIN item_designs idg ON idg.id = os.design_id
        WHERE os.deleted_at IS NULL
        ORDER BY os.created_at DESC
      `
      )
      .all() as OpeningStockRow[]

    return rows.map(mapRow)
  },

  create(payload: OpeningStockPayload) {
    const data = openingStockSchema.parse(payload)
    const db = getDatabase()
    const item = getItemMeta(data.itemId)

    const netWeight = calculateNetWeight(data.grossWeight, data.lessWeight, data.addWeight)
    const fine = calculateFine(netWeight, data.tanch, data.wastage)

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const stockDate = data.stockDate || dayjs().format('YYYY-MM-DD')
    const id = uuidv4()
    const ledgerId = uuidv4()

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO item_opening_stock (
          id,
          stock_date,
          item_id,
          stamp_id,
          design_id,
          barcode,
          remark,
          pcs,
          gross_weight,
          less_weight,
          add_weight,
          net_weight,
          tanch,
          wastage,
          hishob,
          unit,
          fine,
          active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        id,
        stockDate,
        data.itemId,
        emptyToNull(data.stampId),
        emptyToNull(data.designId),
        data.barcode,
        data.remark,
        data.pcs,
        data.grossWeight,
        data.lessWeight,
        data.addWeight,
        netWeight,
        data.tanch,
        data.wastage,
        data.hishob,
        data.unit || 'GM',
        fine,
        data.active ? 1 : 0,
        now,
        now
      )

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
        ledgerId,
        'OPENING_STOCK',
        id,
        stockDate,
        data.itemId,
        emptyToNull(data.stampId),
        emptyToNull(data.designId),
        item.metal_type,
        data.pcs,
        data.grossWeight,
        netWeight,
        fine,
        'Item opening stock',
        now
      )
    })

    transaction()

    return this.getById(id)
  },

  update(id: string, payload: OpeningStockPayload) {
    const data = openingStockSchema.parse(payload)
    const db = getDatabase()
    const item = getItemMeta(data.itemId)

    const existing = db
      .prepare(
        `
        SELECT id
        FROM item_opening_stock
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id)

    if (!existing) {
      throw new Error('Opening stock not found')
    }

    const netWeight = calculateNetWeight(data.grossWeight, data.lessWeight, data.addWeight)
    const fine = calculateFine(netWeight, data.tanch, data.wastage)

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const stockDate = data.stockDate || dayjs().format('YYYY-MM-DD')
    const ledgerId = uuidv4()

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE item_opening_stock
        SET
          stock_date = ?,
          item_id = ?,
          stamp_id = ?,
          design_id = ?,
          barcode = ?,
          remark = ?,
          pcs = ?,
          gross_weight = ?,
          less_weight = ?,
          add_weight = ?,
          net_weight = ?,
          tanch = ?,
          wastage = ?,
          hishob = ?,
          unit = ?,
          fine = ?,
          active = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        stockDate,
        data.itemId,
        emptyToNull(data.stampId),
        emptyToNull(data.designId),
        data.barcode,
        data.remark,
        data.pcs,
        data.grossWeight,
        data.lessWeight,
        data.addWeight,
        netWeight,
        data.tanch,
        data.wastage,
        data.hishob,
        data.unit || 'GM',
        fine,
        data.active ? 1 : 0,
        now,
        id
      )

      db.prepare(
        `
        DELETE FROM stock_ledger
        WHERE source_type = 'OPENING_STOCK'
        AND source_id = ?
      `
      ).run(id)

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
        ledgerId,
        'OPENING_STOCK',
        id,
        stockDate,
        data.itemId,
        emptyToNull(data.stampId),
        emptyToNull(data.designId),
        item.metal_type,
        data.pcs,
        data.grossWeight,
        netWeight,
        fine,
        'Item opening stock updated',
        now
      )
    })

    transaction()

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE item_opening_stock
        SET deleted_at = ?, updated_at = ?
        WHERE id = ?
        AND deleted_at IS NULL
      `
      ).run(now, now, id)

      db.prepare(
        `
        DELETE FROM stock_ledger
        WHERE source_type = 'OPENING_STOCK'
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
          os.id,
          os.stock_date,
          os.item_id,
          i.item_name,
          i.metal_type,
          os.stamp_id,
          ist.stamp_name,
          os.design_id,
          idg.design_name,
          os.barcode,
          os.remark,
          os.pcs,
          os.gross_weight,
          os.less_weight,
          os.add_weight,
          os.net_weight,
          os.tanch,
          os.wastage,
          os.hishob,
          os.unit,
          os.fine,
          os.active,
          os.created_at,
          os.updated_at
        FROM item_opening_stock os
        INNER JOIN items i ON i.id = os.item_id
        LEFT JOIN item_stamps ist ON ist.id = os.stamp_id
        LEFT JOIN item_designs idg ON idg.id = os.design_id
        WHERE os.id = ?
        AND os.deleted_at IS NULL
      `
      )
      .get(id) as OpeningStockRow | undefined

    if (!row) {
      throw new Error('Opening stock not found')
    }

    return mapRow(row)
  }
}
