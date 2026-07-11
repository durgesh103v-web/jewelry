import dayjs from 'dayjs'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const DEFAULT_ID = 'default-cash-fine-opening'

const lineSchema = z.object({
  metalType: z.enum(['Gold', 'Silver']),
  entryType: z.string().trim().optional().default(''),
  details: z.string().trim().optional().default(''),
  weight: z.coerce.number().default(0),
  tanch: z.coerce.number().default(0),
  ptStatus: z.string().trim().optional().default('')
})

const summarySchema = z.object({
  goldPurchaseFine: z.coerce.number().default(0),
  goldPurchaseAmount: z.coerce.number().default(0),
  goldSaleFine: z.coerce.number().default(0),
  goldSaleAmount: z.coerce.number().default(0),
  silverPurchaseFine: z.coerce.number().default(0),
  silverPurchaseAmount: z.coerce.number().default(0),
  silverSaleFine: z.coerce.number().default(0),
  silverSaleAmount: z.coerce.number().default(0),
  openingCash: z.coerce.number().default(0)
})

const saveSchema = z.object({
  lines: z.array(lineSchema).default([]),
  summary: summarySchema
})

type SummaryRow = {
  id: string
  gold_purchase_fine: number
  gold_purchase_amount: number
  gold_sale_fine: number
  gold_sale_amount: number
  silver_purchase_fine: number
  silver_purchase_amount: number
  silver_sale_fine: number
  silver_sale_amount: number
  opening_cash: number
  created_at: string
  updated_at: string
}

type OpeningSummary = {
  goldPurchaseFine: number
  goldPurchaseAmount: number
  goldSaleFine: number
  goldSaleAmount: number
  silverPurchaseFine: number
  silverPurchaseAmount: number
  silverSaleFine: number
  silverSaleAmount: number
  openingCash: number
}

type OpeningLineRecord = {
  id: string
  lineNo: number
  metalType: string
  entryType: string
  details: string
  weight: number
  tanch: number
  fine: number
  ptStatus: string
  createdAt: string
  updatedAt: string
}
type LineRow = {
  id: string
  line_no: number
  metal_type: string
  entry_type: string
  details: string
  weight: number
  tanch: number
  fine: number
  pt_status: string
  created_at: string
  updated_at: string
}

function roundNumber(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function calculateFine(weight: number, tanch: number): number {
  return roundNumber((weight * tanch) / 100)
}

function getEmptySummary(): OpeningSummary {
  return {
    goldPurchaseFine: 0,
    goldPurchaseAmount: 0,
    goldSaleFine: 0,
    goldSaleAmount: 0,
    silverPurchaseFine: 0,
    silverPurchaseAmount: 0,
    silverSaleFine: 0,
    silverSaleAmount: 0,
    openingCash: 0
  }
}

function mapSummary(row?: SummaryRow): OpeningSummary {
  if (!row) return getEmptySummary()

  return {
    goldPurchaseFine: Number(row.gold_purchase_fine || 0),
    goldPurchaseAmount: Number(row.gold_purchase_amount || 0),
    goldSaleFine: Number(row.gold_sale_fine || 0),
    goldSaleAmount: Number(row.gold_sale_amount || 0),
    silverPurchaseFine: Number(row.silver_purchase_fine || 0),
    silverPurchaseAmount: Number(row.silver_purchase_amount || 0),
    silverSaleFine: Number(row.silver_sale_fine || 0),
    silverSaleAmount: Number(row.silver_sale_amount || 0),
    openingCash: Number(row.opening_cash || 0)
  }
}

function mapLine(row: LineRow): OpeningLineRecord {
  return {
    id: row.id,
    lineNo: row.line_no,
    metalType: row.metal_type,
    entryType: row.entry_type,
    details: row.details,
    weight: Number(row.weight || 0),
    tanch: Number(row.tanch || 0),
    fine: Number(row.fine || 0),
    ptStatus: row.pt_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const cashFineOpeningService = {
  get() {
    const db = getDatabase()

    const summaryRow = db
      .prepare(
        `
        SELECT *
        FROM cash_fine_opening_settings
        WHERE id = ?
      `
      )
      .get(DEFAULT_ID) as SummaryRow | undefined

    const lineRows = db
      .prepare(
        `
        SELECT *
        FROM cash_fine_opening_lines
        ORDER BY line_no ASC
      `
      )
      .all() as LineRow[]

    return {
      summary: mapSummary(summaryRow),
      lines: lineRows.map(mapLine)
    }
  },

  save(payload: unknown) {
    const data = saveSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const preparedLines = data.lines.map((line, index) => ({
      id: randomUUID(),
      lineNo: index + 1,
      metalType: line.metalType,
      entryType: line.entryType,
      details: line.details,
      weight: Number(line.weight || 0),
      tanch: Number(line.tanch || 0),
      fine: calculateFine(Number(line.weight || 0), Number(line.tanch || 0)),
      ptStatus: line.ptStatus
    }))

    const transaction = db.transaction(() => {
      const existing = db
        .prepare(
          `
          SELECT id
          FROM cash_fine_opening_settings
          WHERE id = ?
        `
        )
        .get(DEFAULT_ID)

      if (existing) {
        db.prepare(
          `
          UPDATE cash_fine_opening_settings
          SET
            gold_purchase_fine = ?,
            gold_purchase_amount = ?,
            gold_sale_fine = ?,
            gold_sale_amount = ?,
            silver_purchase_fine = ?,
            silver_purchase_amount = ?,
            silver_sale_fine = ?,
            silver_sale_amount = ?,
            opening_cash = ?,
            updated_at = ?
          WHERE id = ?
        `
        ).run(
          data.summary.goldPurchaseFine,
          data.summary.goldPurchaseAmount,
          data.summary.goldSaleFine,
          data.summary.goldSaleAmount,
          data.summary.silverPurchaseFine,
          data.summary.silverPurchaseAmount,
          data.summary.silverSaleFine,
          data.summary.silverSaleAmount,
          data.summary.openingCash,
          now,
          DEFAULT_ID
        )
      } else {
        db.prepare(
          `
          INSERT INTO cash_fine_opening_settings (
            id,
            gold_purchase_fine,
            gold_purchase_amount,
            gold_sale_fine,
            gold_sale_amount,
            silver_purchase_fine,
            silver_purchase_amount,
            silver_sale_fine,
            silver_sale_amount,
            opening_cash,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          DEFAULT_ID,
          data.summary.goldPurchaseFine,
          data.summary.goldPurchaseAmount,
          data.summary.goldSaleFine,
          data.summary.goldSaleAmount,
          data.summary.silverPurchaseFine,
          data.summary.silverPurchaseAmount,
          data.summary.silverSaleFine,
          data.summary.silverSaleAmount,
          data.summary.openingCash,
          now,
          now
        )
      }

      db.prepare('DELETE FROM cash_fine_opening_lines').run()

      const insertLine = db.prepare(
        `
        INSERT INTO cash_fine_opening_lines (
          id,
          line_no,
          metal_type,
          entry_type,
          details,
          weight,
          tanch,
          fine,
          pt_status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )

      preparedLines.forEach((line) => {
        insertLine.run(
          line.id,
          line.lineNo,
          line.metalType,
          line.entryType,
          line.details,
          line.weight,
          line.tanch,
          line.fine,
          line.ptStatus,
          now,
          now
        )
      })
    })

    transaction()

    return this.get()
  }
}
