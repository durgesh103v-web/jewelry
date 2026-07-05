import dayjs from 'dayjs'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const DEFAULT_PRINTER_SETTING_ID = 'default-printer-setting'

const printerSettingSchema = z.object({
  paperSize: z.enum(['A4', '80MM', '58MM']).default('A4'),
  printLayout: z.enum(['STANDARD', 'COMPACT']).default('STANDARD'),
  printCopies: z.coerce.number().int().min(1).max(5).default(1),
  marginTopMm: z.coerce.number().min(0).max(30).default(10),
  marginRightMm: z.coerce.number().min(0).max(30).default(10),
  marginBottomMm: z.coerce.number().min(0).max(30).default(10),
  marginLeftMm: z.coerce.number().min(0).max(30).default(10),
  showFirmHeader: z.boolean().default(true),
  showGstPan: z.boolean().default(true),
  showTerms: z.boolean().default(true),
  showSignature: z.boolean().default(true),
  showPaymentSection: z.boolean().default(true),
  autoPrintAfterSave: z.boolean().default(false)
})

type PrinterSettingRow = {
  id: string
  paper_size: string
  print_layout: string
  print_copies: number
  margin_top_mm: number
  margin_right_mm: number
  margin_bottom_mm: number
  margin_left_mm: number
  show_firm_header: number
  show_gst_pan: number
  show_terms: number
  show_signature: number
  show_payment_section: number
  auto_print_after_save: number
  created_at: string
  updated_at: string
}

type PrinterSettingRecord = {
  id: string
  paperSize: string
  printLayout: string
  printCopies: number
  marginTopMm: number
  marginRightMm: number
  marginBottomMm: number
  marginLeftMm: number
  showFirmHeader: boolean
  showGstPan: boolean
  showTerms: boolean
  showSignature: boolean
  showPaymentSection: boolean
  autoPrintAfterSave: boolean
  createdAt: string
  updatedAt: string
}

function mapRow(row: PrinterSettingRow): PrinterSettingRecord {
  return {
    id: row.id,
    paperSize: row.paper_size,
    printLayout: row.print_layout,
    printCopies: Number(row.print_copies ?? 1),
    marginTopMm: Number(row.margin_top_mm ?? 10),
    marginRightMm: Number(row.margin_right_mm ?? 10),
    marginBottomMm: Number(row.margin_bottom_mm ?? 10),
    marginLeftMm: Number(row.margin_left_mm ?? 10),
    showFirmHeader: Boolean(row.show_firm_header),
    showGstPan: Boolean(row.show_gst_pan),
    showTerms: Boolean(row.show_terms),
    showSignature: Boolean(row.show_signature),
    showPaymentSection: Boolean(row.show_payment_section),
    autoPrintAfterSave: Boolean(row.auto_print_after_save),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const printerSettingService = {
  get() {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT *
        FROM printer_settings
        WHERE id = ?
      `
      )
      .get(DEFAULT_PRINTER_SETTING_ID) as PrinterSettingRow | undefined

    if (!row) {
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

      db.prepare(
        `
        INSERT INTO printer_settings (
          id,
          paper_size,
          print_layout,
          print_copies,
          margin_top_mm,
          margin_right_mm,
          margin_bottom_mm,
          margin_left_mm,
          show_firm_header,
          show_gst_pan,
          show_terms,
          show_signature,
          show_payment_section,
          auto_print_after_save,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        DEFAULT_PRINTER_SETTING_ID,
        'A4',
        'STANDARD',
        1,
        10,
        10,
        10,
        10,
        1,
        1,
        1,
        1,
        1,
        0,
        now,
        now
      )

      const created = db
        .prepare(
          `
          SELECT *
          FROM printer_settings
          WHERE id = ?
        `
        )
        .get(DEFAULT_PRINTER_SETTING_ID) as PrinterSettingRow

      return mapRow(created)
    }

    return mapRow(row)
  },

  save(payload: unknown) {
    const data = printerSettingSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = db
      .prepare(
        `
        SELECT id
        FROM printer_settings
        WHERE id = ?
      `
      )
      .get(DEFAULT_PRINTER_SETTING_ID)

    if (existing) {
      db.prepare(
        `
        UPDATE printer_settings
        SET
          paper_size = ?,
          print_layout = ?,
          print_copies = ?,
          margin_top_mm = ?,
          margin_right_mm = ?,
          margin_bottom_mm = ?,
          margin_left_mm = ?,
          show_firm_header = ?,
          show_gst_pan = ?,
          show_terms = ?,
          show_signature = ?,
          show_payment_section = ?,
          auto_print_after_save = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        data.paperSize,
        data.printLayout,
        data.printCopies,
        data.marginTopMm,
        data.marginRightMm,
        data.marginBottomMm,
        data.marginLeftMm,
        data.showFirmHeader ? 1 : 0,
        data.showGstPan ? 1 : 0,
        data.showTerms ? 1 : 0,
        data.showSignature ? 1 : 0,
        data.showPaymentSection ? 1 : 0,
        data.autoPrintAfterSave ? 1 : 0,
        now,
        DEFAULT_PRINTER_SETTING_ID
      )
    } else {
      db.prepare(
        `
        INSERT INTO printer_settings (
          id,
          paper_size,
          print_layout,
          print_copies,
          margin_top_mm,
          margin_right_mm,
          margin_bottom_mm,
          margin_left_mm,
          show_firm_header,
          show_gst_pan,
          show_terms,
          show_signature,
          show_payment_section,
          auto_print_after_save,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        DEFAULT_PRINTER_SETTING_ID,
        data.paperSize,
        data.printLayout,
        data.printCopies,
        data.marginTopMm,
        data.marginRightMm,
        data.marginBottomMm,
        data.marginLeftMm,
        data.showFirmHeader ? 1 : 0,
        data.showGstPan ? 1 : 0,
        data.showTerms ? 1 : 0,
        data.showSignature ? 1 : 0,
        data.showPaymentSection ? 1 : 0,
        data.autoPrintAfterSave ? 1 : 0,
        now,
        now
      )
    }

    return this.get()
  }
}
