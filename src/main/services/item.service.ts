import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const itemSchema = z.object({
  itemName: z.string().trim().min(1, 'Item name is required').max(120),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']),
  itemGroupId: z.string().trim().min(1, 'Item group is required'),
  defaultStampId: z.string().trim().optional().default(''),
  defaultDesignId: z.string().trim().optional().default(''),
  barcodeItem: z.boolean().default(false),
  barcodeType: z.string().trim().max(50).optional().default(''),
  labourChargesBy: z.enum(['Kg', 'Gm', 'Pcs']).default('Kg'),
  salePurchaseBy: z.enum(['Fine', 'Weight', 'Pcs']).default('Fine'),
  gstHsnCode: z.string().trim().max(30).optional().default(''),
  fixedWeightPerPcs: z.coerce.number().default(0),
  defaultTanch: z.coerce.number().default(0),
  defaultWastage: z.coerce.number().default(0),
  defaultLabourRate: z.coerce.number().default(0),
  labourRateType: z.enum(['Kg', 'Gm', 'Pcs']).default('Kg'),
  active: z.boolean().default(true)
})

type ItemPayload = z.infer<typeof itemSchema>

type ItemRecord = {
  id: string
  itemName: string
  metalType: string
  itemGroupId: string
  groupName: string
  defaultStampId: string
  stampName: string
  defaultDesignId: string
  designName: string
  barcodeItem: boolean
  barcodeType: string
  labourChargesBy: string
  salePurchaseBy: string
  gstHsnCode: string
  fixedWeightPerPcs: number
  defaultTanch: number
  defaultWastage: number
  defaultLabourRate: number
  labourRateType: string
  active: boolean
  createdAt: string
  updatedAt: string
}

type ItemRow = {
  id: string
  item_name: string
  metal_type: string
  item_group_id: string
  group_name: string
  default_stamp_id: string | null
  stamp_name: string | null
  default_design_id: string | null
  design_name: string | null
  barcode_item: number
  barcode_type: string | null
  labour_charges_by: string
  sale_purchase_by: string
  gst_hsn_code: string | null
  fixed_weight_per_pcs: number
  default_tanch: number
  default_wastage: number
  default_labour_rate: number
  labour_rate_type: string
  active: number
  created_at: string
  updated_at: string
}

function emptyToNull(value: string): string | null {
  return value.trim() ? value.trim() : null
}

function mapRow(row: ItemRow): ItemRecord {
  return {
    id: row.id,
    itemName: row.item_name,
    metalType: row.metal_type,
    itemGroupId: row.item_group_id,
    groupName: row.group_name,
    defaultStampId: row.default_stamp_id ?? '',
    stampName: row.stamp_name ?? '',
    defaultDesignId: row.default_design_id ?? '',
    designName: row.design_name ?? '',
    barcodeItem: Boolean(row.barcode_item),
    barcodeType: row.barcode_type ?? '',
    labourChargesBy: row.labour_charges_by,
    salePurchaseBy: row.sale_purchase_by,
    gstHsnCode: row.gst_hsn_code ?? '',
    fixedWeightPerPcs: Number(row.fixed_weight_per_pcs ?? 0),
    defaultTanch: Number(row.default_tanch ?? 0),
    defaultWastage: Number(row.default_wastage ?? 0),
    defaultLabourRate: Number(row.default_labour_rate ?? 0),
    labourRateType: row.labour_rate_type ?? 'Kg',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function assertActiveReference(tableName: string, id: string, errorMessage: string): void {
  if (!id.trim()) return

  const db = getDatabase()
  const row = db
    .prepare(
      `
      SELECT id
      FROM ${tableName}
      WHERE id = ?
      AND deleted_at IS NULL
    `
    )
    .get(id)

  if (!row) {
    throw new Error(errorMessage)
  }
}

export const itemService = {
  list() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT
          i.id,
          i.item_name,
          i.metal_type,
          i.item_group_id,
          ig.group_name,
          i.default_stamp_id,
          ist.stamp_name,
          i.default_design_id,
          idg.design_name,
          i.barcode_item,
          i.barcode_type,
          i.labour_charges_by,
          i.sale_purchase_by,
          i.gst_hsn_code,
          i.fixed_weight_per_pcs,
          i.default_tanch,
          i.default_wastage,
          i.default_labour_rate,
          i.labour_rate_type,
          i.active,
          i.created_at,
          i.updated_at
        FROM items i
        INNER JOIN item_groups ig ON ig.id = i.item_group_id
        LEFT JOIN item_stamps ist ON ist.id = i.default_stamp_id
        LEFT JOIN item_designs idg ON idg.id = i.default_design_id
        WHERE i.deleted_at IS NULL
        ORDER BY i.metal_type ASC, i.item_name ASC
      `
      )
      .all() as ItemRow[]

    return rows.map(mapRow)
  },

  create(payload: ItemPayload) {
    const data = itemSchema.parse(payload)
    const db = getDatabase()

    assertActiveReference('item_groups', data.itemGroupId, 'Item group not found')
    assertActiveReference('item_stamps', data.defaultStampId, 'Item stamp not found')
    assertActiveReference('item_designs', data.defaultDesignId, 'Item design not found')

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM items
        WHERE LOWER(item_name) = LOWER(?)
        AND metal_type = ?
        AND deleted_at IS NULL
      `
      )
      .get(data.itemName, data.metalType)

    if (duplicate) {
      throw new Error('Item already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    db.prepare(
      `
      INSERT INTO items (
        id,
        item_name,
        metal_type,
        item_group_id,
        default_stamp_id,
        default_design_id,
        barcode_item,
        barcode_type,
        labour_charges_by,
        sale_purchase_by,
        gst_hsn_code,
        fixed_weight_per_pcs,
        default_tanch,
        default_wastage,
        default_labour_rate,
        labour_rate_type,
        active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      data.itemName,
      data.metalType,
      data.itemGroupId,
      emptyToNull(data.defaultStampId),
      emptyToNull(data.defaultDesignId),
      data.barcodeItem ? 1 : 0,
      data.barcodeType,
      data.labourChargesBy,
      data.salePurchaseBy,
      data.gstHsnCode,
      data.fixedWeightPerPcs,
      data.defaultTanch,
      data.defaultWastage,
      data.defaultLabourRate,
      data.labourRateType,
      data.active ? 1 : 0,
      now,
      now
    )

    return this.getById(id)
  },

  update(id: string, payload: ItemPayload) {
    const data = itemSchema.parse(payload)
    const db = getDatabase()

    const existing = db
      .prepare(
        `
        SELECT id
        FROM items
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id)

    if (!existing) {
      throw new Error('Item not found')
    }

    assertActiveReference('item_groups', data.itemGroupId, 'Item group not found')
    assertActiveReference('item_stamps', data.defaultStampId, 'Item stamp not found')
    assertActiveReference('item_designs', data.defaultDesignId, 'Item design not found')

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM items
        WHERE LOWER(item_name) = LOWER(?)
        AND metal_type = ?
        AND id != ?
        AND deleted_at IS NULL
      `
      )
      .get(data.itemName, data.metalType, id)

    if (duplicate) {
      throw new Error('Another item with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE items
      SET
        item_name = ?,
        metal_type = ?,
        item_group_id = ?,
        default_stamp_id = ?,
        default_design_id = ?,
        barcode_item = ?,
        barcode_type = ?,
        labour_charges_by = ?,
        sale_purchase_by = ?,
        gst_hsn_code = ?,
        fixed_weight_per_pcs = ?,
        default_tanch = ?,
        default_wastage = ?,
        default_labour_rate = ?,
        labour_rate_type = ?,
        active = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(
      data.itemName,
      data.metalType,
      data.itemGroupId,
      emptyToNull(data.defaultStampId),
      emptyToNull(data.defaultDesignId),
      data.barcodeItem ? 1 : 0,
      data.barcodeType,
      data.labourChargesBy,
      data.salePurchaseBy,
      data.gstHsnCode,
      data.fixedWeightPerPcs,
      data.defaultTanch,
      data.defaultWastage,
      data.defaultLabourRate,
      data.labourRateType,
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
      UPDATE items
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
          i.id,
          i.item_name,
          i.metal_type,
          i.item_group_id,
          ig.group_name,
          i.default_stamp_id,
          ist.stamp_name,
          i.default_design_id,
          idg.design_name,
          i.barcode_item,
          i.barcode_type,
          i.labour_charges_by,
          i.sale_purchase_by,
          i.gst_hsn_code,
          i.fixed_weight_per_pcs,
          i.default_tanch,
          i.default_wastage,
          i.default_labour_rate,
          i.labour_rate_type,
          i.active,
          i.created_at,
          i.updated_at
        FROM items i
        INNER JOIN item_groups ig ON ig.id = i.item_group_id
        LEFT JOIN item_stamps ist ON ist.id = i.default_stamp_id
        LEFT JOIN item_designs idg ON idg.id = i.default_design_id
        WHERE i.id = ?
        AND i.deleted_at IS NULL
      `
      )
      .get(id) as ItemRow | undefined

    if (!row) {
      throw new Error('Item not found')
    }

    return mapRow(row)
  }
}
