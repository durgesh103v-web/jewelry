import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { hashPassword, verifyPassword } from './user.service'
import { firmService } from './firm.service'

export type BusinessType = 'WHOLESALE' | 'RETAIL'

const BUSINESS_TYPE_KEY = 'business_type'

const registerSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(60),
  password: z.string().min(4, 'Password must be at least 4 characters').max(255),
  firmName: z.string().trim().min(1, 'Shop / firm name is required').max(120),
  businessType: z.enum(['WHOLESALE', 'RETAIL'])
})

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(4, 'New password must be at least 4 characters').max(255)
})

type SingleUserRow = {
  id: string
  username: string
  password_hash: string
  role: string
}

export type AuthSession = {
  userId: string
  username: string
  role: string
  businessType: BusinessType
}

let currentSession: AuthSession | null = null

function getBusinessType(): BusinessType | null {
  const db = getDatabase()

  const row = db
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(BUSINESS_TYPE_KEY) as { value: string } | undefined

  const value = row?.value

  return value === 'WHOLESALE' || value === 'RETAIL' ? value : null
}

function setBusinessType(type: BusinessType): void {
  const db = getDatabase()
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  db.prepare(
    `
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `
  ).run(BUSINESS_TYPE_KEY, type, now)
}

function getSingleUser(): SingleUserRow | undefined {
  const db = getDatabase()

  return db
    .prepare(
      `
      SELECT id, username, password_hash, role
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    `
    )
    .get() as SingleUserRow | undefined
}

export const authService = {
  getState() {
    const user = getSingleUser()

    return {
      registered: Boolean(user),
      username: user?.username ?? null,
      businessType: getBusinessType(),
      authenticated: Boolean(currentSession)
    }
  },

  register(payload: unknown): AuthSession {
    const data = registerSchema.parse(payload)
    const db = getDatabase()

    if (getSingleUser()) {
      throw new Error('An account already exists on this computer. Please log in instead.')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO users (
          id, username, password_hash, full_name, role, active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(id, data.username, hashPassword(data.password), '', 'ADMIN', 1, now, now)

      setBusinessType(data.businessType)

      const firm = firmService.get()
      firmService.save({ ...firm, firmName: data.firmName })
    })

    transaction()

    currentSession = {
      userId: id,
      username: data.username,
      role: 'ADMIN',
      businessType: data.businessType
    }

    return currentSession
  },

  login(payload: unknown): AuthSession {
    const data = loginSchema.parse(payload)

    const user = getSingleUser()

    if (!user || user.username.toLowerCase() !== data.username.toLowerCase()) {
      throw new Error('Invalid username or password')
    }

    if (!verifyPassword(data.password, user.password_hash)) {
      throw new Error('Invalid username or password')
    }

    let businessType = getBusinessType()
    if (!businessType) {
      businessType = 'WHOLESALE'
      setBusinessType(businessType)
    }

    currentSession = {
      userId: user.id,
      username: user.username,
      role: user.role,
      businessType
    }

    return currentSession
  },

  logout() {
    currentSession = null
    return { success: true }
  },

  getSession(): AuthSession | null {
    return currentSession
  },

  changePassword(payload: unknown) {
    const data = changePasswordSchema.parse(payload)
    const db = getDatabase()

    const user = getSingleUser()

    if (!user) {
      throw new Error('No account found')
    }

    if (!verifyPassword(data.currentPassword, user.password_hash)) {
      throw new Error('Current password is incorrect')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(hashPassword(data.newPassword), now, user.id)

    return { success: true }
  }
}
