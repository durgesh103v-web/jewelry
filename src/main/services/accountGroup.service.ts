import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const accountGroupSchema = z.object({
  groupName: z.string().trim().min(1, 'Group name is required').max(80),
  groupType: z.enum(['Customer', 'Supplier', 'Karigar', 'Cash', 'Bank', 'Other']),
  description: z.string().trim().max(255).optional().default(''),
  active: z.boolean().default(true)
})

type AccountGroupPayload = z.infer<typeof accountGroupSchema>

type AccountGroupRecord = {
  id: string
  groupName: string
  groupType: string
  description: string
  active: boolean
  createdAt: string
  updatedAt: string
}

type AccountGroupRow = {
  id: string
  group_name: string
  group_type: string
  description: string | null
  active: number
  created_at: string
  updated_at: string
}

function mapRow(row: AccountGroupRow): AccountGroupRecord {
  return {
    id: row.id,
    groupName: row.group_name,
    groupType: row.group_type,
    description: row.description ?? '',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const accountGroupService = {
  list() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT id, group_name, group_type, description, active, created_at, updated_at
        FROM account_groups
        WHERE deleted_at IS NULL
        ORDER BY group_name ASC
      `
      )
      .all() as AccountGroupRow[]

    return rows.map(mapRow)
  },

  create(payload: AccountGroupPayload) {
    const data = accountGroupSchema.parse(payload)
    const db = getDatabase()

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM account_groups
        WHERE LOWER(group_name) = LOWER(?)
        AND deleted_at IS NULL
      `
      )
      .get(data.groupName)

    if (duplicate) {
      throw new Error('Account group already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    db.prepare(
      `
      INSERT INTO account_groups (
        id,
        group_name,
        group_type,
        description,
        active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, data.groupName, data.groupType, data.description, data.active ? 1 : 0, now, now)

    return this.getById(id)
  },

  update(id: string, payload: AccountGroupPayload) {
    const data = accountGroupSchema.parse(payload)
    const db = getDatabase()

    const existing = db
      .prepare(
        `
        SELECT id
        FROM account_groups
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id)

    if (!existing) {
      throw new Error('Account group not found')
    }

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM account_groups
        WHERE LOWER(group_name) = LOWER(?)
        AND id != ?
        AND deleted_at IS NULL
      `
      )
      .get(data.groupName, id)

    if (duplicate) {
      throw new Error('Another account group with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE account_groups
      SET
        group_name = ?,
        group_type = ?,
        description = ?,
        active = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(data.groupName, data.groupType, data.description, data.active ? 1 : 0, now, id)

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE account_groups
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
        SELECT id, group_name, group_type, description, active, created_at, updated_at
        FROM account_groups
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as AccountGroupRow | undefined

    if (!row) {
      throw new Error('Account group not found')
    }

    return mapRow(row)
  }
}
