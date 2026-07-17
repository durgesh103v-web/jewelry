import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getDatabase } from '../database/connection'

const userSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(60),
  password: z.string().trim().max(255).optional().default(''),
  fullName: z.string().trim().max(120).optional().default(''),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  active: z.boolean().default(true)
})

type UserPayload = z.infer<typeof userSchema>

type UserRecord = {
  id: string
  username: string
  fullName: string
  role: string
  active: boolean
  createdAt: string
  updatedAt: string
}

type UserRow = {
  id: string
  username: string
  password_hash: string
  full_name: string | null
  role: string
  active: number
  created_at: string
  updated_at: string
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, derivedHex] = String(storedHash || '').split(':')
  if (!salt || !derivedHex) return false

  const derived = scryptSync(password, salt, 64)
  const stored = Buffer.from(derivedHex, 'hex')

  if (derived.length !== stored.length) return false

  return timingSafeEqual(derived, stored)
}

function mapRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name ?? '',
    role: row.role,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const userService = {
  list() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT id, username, password_hash, full_name, role, active, created_at, updated_at
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY username ASC
      `
      )
      .all() as UserRow[]

    return rows.map(mapRow)
  },

  create(payload: UserPayload) {
    const data = userSchema.parse(payload)
    const db = getDatabase()

    if (!data.password) {
      throw new Error('Password is required for a new user')
    }

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE LOWER(username) = LOWER(?)
        AND deleted_at IS NULL
      `
      )
      .get(data.username)

    if (duplicate) {
      throw new Error('Username already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    db.prepare(
      `
      INSERT INTO users (
        id,
        username,
        password_hash,
        full_name,
        role,
        active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      data.username,
      hashPassword(data.password),
      data.fullName,
      data.role,
      data.active ? 1 : 0,
      now,
      now
    )

    return this.getById(id)
  },

  update(id: string, payload: UserPayload) {
    const data = userSchema.parse(payload)
    const db = getDatabase()

    const existing = db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id)

    if (!existing) {
      throw new Error('User not found')
    }

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE LOWER(username) = LOWER(?)
        AND id != ?
        AND deleted_at IS NULL
      `
      )
      .get(data.username, id)

    if (duplicate) {
      throw new Error('Another user with this username already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    if (data.password) {
      db.prepare(
        `
        UPDATE users
        SET
          username = ?,
          password_hash = ?,
          full_name = ?,
          role = ?,
          active = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        data.username,
        hashPassword(data.password),
        data.fullName,
        data.role,
        data.active ? 1 : 0,
        now,
        id
      )
    } else {
      db.prepare(
        `
        UPDATE users
        SET
          username = ?,
          full_name = ?,
          role = ?,
          active = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(data.username, data.fullName, data.role, data.active ? 1 : 0, now, id)
    }

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const activeAdminCount = db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM users
        WHERE role = 'ADMIN'
        AND active = 1
        AND deleted_at IS NULL
      `
      )
      .get() as { count: number }

    const target = db
      .prepare(`SELECT role, active FROM users WHERE id = ? AND deleted_at IS NULL`)
      .get(id) as { role: string; active: number } | undefined

    if (target && target.role === 'ADMIN' && target.active && activeAdminCount.count <= 1) {
      throw new Error('Cannot delete the last active admin user')
    }

    db.prepare(
      `
      UPDATE users
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
        SELECT id, username, password_hash, full_name, role, active, created_at, updated_at
        FROM users
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as UserRow | undefined

    if (!row) {
      throw new Error('User not found')
    }

    return mapRow(row)
  }
}
