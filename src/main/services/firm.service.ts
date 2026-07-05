import dayjs from 'dayjs'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const DEFAULT_FIRM_ID = 'default-firm'

const firmSchema = z.object({
  firmName: z.string().trim().optional().default(''),
  ownerName: z.string().trim().optional().default(''),
  address: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  state: z.string().trim().optional().default(''),
  pincode: z.string().trim().optional().default(''),
  mobileNumber: z.string().trim().optional().default(''),
  whatsappNumber: z.string().trim().optional().default(''),
  email: z.string().trim().optional().default(''),
  gstNo: z.string().trim().optional().default(''),
  panNo: z.string().trim().optional().default(''),
  billTitle: z.string().trim().optional().default('SALE BILL'),
  billPrefix: z.string().trim().optional().default('SL'),
  terms: z.string().trim().optional().default(''),
  active: z.boolean().default(true)
})

type FirmRow = {
  id: string
  firm_name: string
  owner_name: string
  address: string
  city: string
  state: string
  pincode: string
  mobile_number: string
  whatsapp_number: string
  email: string
  gst_no: string
  pan_no: string
  bill_title: string
  bill_prefix: string
  terms: string
  active: number
  created_at: string
  updated_at: string
}

type FirmRecord = {
  id: string
  firmName: string
  ownerName: string
  address: string
  city: string
  state: string
  pincode: string
  mobileNumber: string
  whatsappNumber: string
  email: string
  gstNo: string
  panNo: string
  billTitle: string
  billPrefix: string
  terms: string
  active: boolean
  createdAt: string
  updatedAt: string
}
function mapRow(row: FirmRow): FirmRecord {
  return {
    id: row.id,
    firmName: row.firm_name,
    ownerName: row.owner_name,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    mobileNumber: row.mobile_number,
    whatsappNumber: row.whatsapp_number,
    email: row.email,
    gstNo: row.gst_no,
    panNo: row.pan_no,
    billTitle: row.bill_title,
    billPrefix: row.bill_prefix,
    terms: row.terms,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const firmService = {
  get() {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT *
        FROM firm_settings
        WHERE id = ?
      `
      )
      .get(DEFAULT_FIRM_ID) as FirmRow | undefined

    if (!row) {
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

      db.prepare(
        `
        INSERT INTO firm_settings (
          id,
          firm_name,
          bill_title,
          bill_prefix,
          active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      ).run(DEFAULT_FIRM_ID, '', 'SALE BILL', 'SL', 1, now, now)

      const created = db
        .prepare(
          `
          SELECT *
          FROM firm_settings
          WHERE id = ?
        `
        )
        .get(DEFAULT_FIRM_ID) as FirmRow

      return mapRow(created)
    }

    return mapRow(row)
  },

  save(payload: unknown) {
    const data = firmSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = db
      .prepare(
        `
        SELECT id
        FROM firm_settings
        WHERE id = ?
      `
      )
      .get(DEFAULT_FIRM_ID)

    if (existing) {
      db.prepare(
        `
        UPDATE firm_settings
        SET
          firm_name = ?,
          owner_name = ?,
          address = ?,
          city = ?,
          state = ?,
          pincode = ?,
          mobile_number = ?,
          whatsapp_number = ?,
          email = ?,
          gst_no = ?,
          pan_no = ?,
          bill_title = ?,
          bill_prefix = ?,
          terms = ?,
          active = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        data.firmName,
        data.ownerName,
        data.address,
        data.city,
        data.state,
        data.pincode,
        data.mobileNumber,
        data.whatsappNumber,
        data.email,
        data.gstNo,
        data.panNo,
        data.billTitle || 'SALE BILL',
        data.billPrefix || 'SL',
        data.terms,
        data.active ? 1 : 0,
        now,
        DEFAULT_FIRM_ID
      )
    } else {
      db.prepare(
        `
        INSERT INTO firm_settings (
          id,
          firm_name,
          owner_name,
          address,
          city,
          state,
          pincode,
          mobile_number,
          whatsapp_number,
          email,
          gst_no,
          pan_no,
          bill_title,
          bill_prefix,
          terms,
          active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        DEFAULT_FIRM_ID,
        data.firmName,
        data.ownerName,
        data.address,
        data.city,
        data.state,
        data.pincode,
        data.mobileNumber,
        data.whatsappNumber,
        data.email,
        data.gstNo,
        data.panNo,
        data.billTitle || 'SALE BILL',
        data.billPrefix || 'SL',
        data.terms,
        data.active ? 1 : 0,
        now,
        now
      )
    }

    return this.get()
  }
}
