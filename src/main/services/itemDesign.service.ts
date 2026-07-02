import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const itemDesignSchema = z.object({
  designName: z.string().trim().min(1, 'Item design name is required').max(80),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']),
  description: z.string().trim().max(255).optional().default(''),
  active: z.boolean().default(true)
})

type ItemDesignPayload = z.infer<typeof itemDesignSchema>

type ItemDesignRecord = {
  id: string
  designName: string
  metalType: string
  description: string
  active: boolean
  createdAt: string
  updatedAt: string
}

type ItemDesignRow = {
  id: string
  design_name: string
  metal_type: string
  description: string | null
  active: number
  created_at: string
  updated_at: string
}

function mapRow(row: ItemDesignRow): ItemDesignRecord {
  return {
    id: row.id,
    designName: row.design_name,
    metalType: row.metal_type,
    description: row.description ?? '',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const itemDesignService = {
  list() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT id, design_name, metal_type, description, active, created_at, updated_at
        FROM item_designs
        WHERE deleted_at IS NULL
        ORDER BY metal_type ASC, design_name ASC
      `
      )
      .all() as ItemDesignRow[]

    return rows.map(mapRow)
  },

  create(payload: ItemDesignPayload) {
    const data = itemDesignSchema.parse(payload)
    const db = getDatabase()

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM item_designs
        WHERE LOWER(design_name) = LOWER(?)
        AND metal_type = ?
        AND deleted_at IS NULL
      `
      )
      .get(data.designName, data.metalType)

    if (duplicate) {
      throw new Error('Item design already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    db.prepare(
      `
      INSERT INTO item_designs (
        id,
        design_name,
        metal_type,
        description,
        active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, data.designName, data.metalType, data.description, data.active ? 1 : 0, now, now)

    return this.getById(id)
  },

  update(id: string, payload: ItemDesignPayload) {
    const data = itemDesignSchema.parse(payload)
    const db = getDatabase()

    const existing = db
      .prepare(
        `
        SELECT id
        FROM item_designs
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id)

    if (!existing) {
      throw new Error('Item design not found')
    }

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM item_designs
        WHERE LOWER(design_name) = LOWER(?)
        AND metal_type = ?
        AND id != ?
        AND deleted_at IS NULL
      `
      )
      .get(data.designName, data.metalType, id)

    if (duplicate) {
      throw new Error('Another item design with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE item_designs
      SET
        design_name = ?,
        metal_type = ?,
        description = ?,
        active = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(data.designName, data.metalType, data.description, data.active ? 1 : 0, now, id)

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE item_designs
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
        SELECT id, design_name, metal_type, description, active, created_at, updated_at
        FROM item_designs
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as ItemDesignRow | undefined

    if (!row) {
      throw new Error('Item design not found')
    }

    return mapRow(row)
  }
}
