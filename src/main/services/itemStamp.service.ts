import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const itemStampSchema = z.object({
  stampName: z.string().trim().min(1, 'Item stamp name is required').max(80),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']),
  description: z.string().trim().max(255).optional().default(''),
  active: z.boolean().default(true)
})

type ItemStampPayload = z.infer<typeof itemStampSchema>

type ItemStampRecord = {
  id: string
  stampName: string
  metalType: string
  description: string
  active: boolean
  createdAt: string
  updatedAt: string
}

type ItemStampRow = {
  id: string
  stamp_name: string
  metal_type: string
  description: string | null
  active: number
  created_at: string
  updated_at: string
}

function mapRow(row: ItemStampRow): ItemStampRecord {
  return {
    id: row.id,
    stampName: row.stamp_name,
    metalType: row.metal_type,
    description: row.description ?? '',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const itemStampService = {
  list() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT id, stamp_name, metal_type, description, active, created_at, updated_at
        FROM item_stamps
        WHERE deleted_at IS NULL
        ORDER BY metal_type ASC, stamp_name ASC
      `
      )
      .all() as ItemStampRow[]

    return rows.map(mapRow)
  },

  create(payload: ItemStampPayload) {
    const data = itemStampSchema.parse(payload)
    const db = getDatabase()

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM item_stamps
        WHERE LOWER(stamp_name) = LOWER(?)
        AND metal_type = ?
        AND deleted_at IS NULL
      `
      )
      .get(data.stampName, data.metalType)

    if (duplicate) {
      throw new Error('Item stamp already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    db.prepare(
      `
      INSERT INTO item_stamps (
        id,
        stamp_name,
        metal_type,
        description,
        active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, data.stampName, data.metalType, data.description, data.active ? 1 : 0, now, now)

    return this.getById(id)
  },

  update(id: string, payload: ItemStampPayload) {
    const data = itemStampSchema.parse(payload)
    const db = getDatabase()

    const existing = db
      .prepare(
        `
        SELECT id
        FROM item_stamps
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id)

    if (!existing) {
      throw new Error('Item stamp not found')
    }

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM item_stamps
        WHERE LOWER(stamp_name) = LOWER(?)
        AND metal_type = ?
        AND id != ?
        AND deleted_at IS NULL
      `
      )
      .get(data.stampName, data.metalType, id)

    if (duplicate) {
      throw new Error('Another item stamp with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE item_stamps
      SET
        stamp_name = ?,
        metal_type = ?,
        description = ?,
        active = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(data.stampName, data.metalType, data.description, data.active ? 1 : 0, now, id)

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE item_stamps
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
        SELECT id, stamp_name, metal_type, description, active, created_at, updated_at
        FROM item_stamps
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as ItemStampRow | undefined

    if (!row) {
      throw new Error('Item stamp not found')
    }

    return mapRow(row)
  }
}
