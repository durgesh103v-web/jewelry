import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { calculateSaleItemTotals, type LabourRateType } from './jewelleryFormula.service'
import { estimateNumberService } from './estimateNumber.service'
import { firmService } from './firm.service'
import { saleService } from './sale.service'

const estimateItemLineSchema = z.object({
  itemId: z.string().trim().min(1, 'Item is required'),
  stampId: z.string().trim().optional().default(''),
  designId: z.string().trim().optional().default(''),
  barcode: z.string().trim().optional().default(''),
  remark: z.string().trim().optional().default(''),
  pcs: z.coerce.number().default(0),
  grossWeight: z.coerce.number().default(0),
  addWeight: z.coerce.number().default(0),
  packWeight: z.coerce.number().optional(),
  tunch: z.coerce.number().optional(),
  wastage: z.coerce.number().optional(),
  labourRate: z.coerce.number().optional(),
  labourRateType: z.enum(['Kg', 'Gm', 'Pcs']).optional(),
  hsnCode: z.string().trim().optional().default(''),
  gstRate: z.coerce.number().optional().default(0),
  taxableAmount: z.coerce.number().optional().default(0)
})

const estimateSchema = z.object({
  estimateDate: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  phone: z.string().trim().optional().default(''),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']).default('Silver'),
  narration: z.string().trim().optional().default(''),
  validUntil: z.string().trim().optional().default(''),
  itemLines: z.array(estimateItemLineSchema).min(1, 'At least one item is required')
})

type EstimatePayload = z.infer<typeof estimateSchema>

type ItemMetaRow = {
  id: string
  item_name: string
  metal_type: string
  default_stamp_id: string | null
  default_design_id: string | null
  fixed_weight_per_pcs: number
  default_tanch: number
  default_wastage: number
  default_labour_rate: number
  labour_rate_type: string
  gst_hsn_code: string | null
}

function emptyToNull(value: string): string | null {
  return value.trim() ? value.trim() : null
}

function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
}

function getItemMeta(itemId: string): ItemMetaRow {
  const db = getDatabase()

  const item = db
    .prepare(
      `
      SELECT
        id,
        item_name,
        metal_type,
        default_stamp_id,
        default_design_id,
        fixed_weight_per_pcs,
        default_tanch,
        default_wastage,
        default_labour_rate,
        labour_rate_type,
        gst_hsn_code
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

function getAccountState(accountId: string): string {
  const db = getDatabase()

  const account = db
    .prepare(
      `
      SELECT state
      FROM accounts
      WHERE id = ?
    `
    )
    .get(accountId) as { state: string } | undefined

  return account?.state ?? ''
}

// Same-state assumption: if the account's recorded state matches the firm's state, the
// sale is treated as intra-state (CGST + SGST split). If the account has no state on file
// (typical for a walk-in retail customer) or the firm's own state is not configured, we also
// default to intra-state since the vast majority of retail counter estimates are local. Only
// when both states are known and differ do we treat it as inter-state (IGST only).
function isInterState(firmState: string, accountState: string): boolean {
  const cleanFirmState = firmState.trim().toLowerCase()
  const cleanAccountState = accountState.trim().toLowerCase()

  if (!cleanFirmState || !cleanAccountState) return false

  return cleanFirmState !== cleanAccountState
}

function computeGstSplit(
  taxableAmount: number,
  gstRate: number,
  interState: boolean
): { cgst: number; sgst: number; igst: number } {
  const totalTax = roundMoney((taxableAmount * gstRate) / 100)

  if (interState) {
    return { cgst: 0, sgst: 0, igst: totalTax }
  }

  const half = roundMoney(totalTax / 2)

  return { cgst: half, sgst: roundMoney(totalTax - half), igst: 0 }
}

function getEstimateHeaderRow(id: string): Record<string, unknown> | undefined {
  const db = getDatabase()

  return db
    .prepare(
      `
      SELECT
        eh.*,
        a.account_name,
        a.mobile_number
      FROM estimate_headers eh
      INNER JOIN accounts a ON a.id = eh.account_id
      WHERE eh.id = ?
      AND eh.deleted_at IS NULL
    `
    )
    .get(id) as Record<string, unknown> | undefined
}

function prepareItemLines(
  itemLines: EstimatePayload['itemLines'],
  interState: boolean
): Array<{
  id: string
  lineNo: number
  item: ItemMetaRow
  itemId: string
  stampId: string
  designId: string
  barcode: string
  remark: string
  pcs: number
  grossWeight: number
  netWeight: number
  tunch: number
  wastage: number
  fine: number
  majuri: number
  hsnCode: string
  gstRate: number
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
}> {
  return itemLines.map((line, index) => {
    const item = getItemMeta(line.itemId)
    const packWeight = line.packWeight ?? Number(item.fixed_weight_per_pcs ?? 0)
    const tunch = line.tunch ?? Number(item.default_tanch ?? 0)
    const wastage = line.wastage ?? Number(item.default_wastage ?? 0)
    const labourRate = line.labourRate ?? Number(item.default_labour_rate ?? 0)
    const labourRateType = (line.labourRateType ?? item.labour_rate_type ?? 'Kg') as LabourRateType

    const totals = calculateSaleItemTotals({
      pcs: line.pcs,
      grossWeight: line.grossWeight,
      addWeight: line.addWeight,
      packWeight,
      tunch,
      wastage,
      labourRate,
      labourRateType
    })

    const taxableAmount = roundMoney(line.taxableAmount)
    const gstRate = Number(line.gstRate || 0)
    const gstSplit = computeGstSplit(taxableAmount, gstRate, interState)

    return {
      id: uuidv4(),
      lineNo: index + 1,
      item,
      itemId: line.itemId,
      stampId: line.stampId || item.default_stamp_id || '',
      designId: line.designId || item.default_design_id || '',
      barcode: line.barcode || '',
      remark: line.remark || '',
      pcs: line.pcs,
      grossWeight: line.grossWeight,
      netWeight: totals.netWeight,
      tunch,
      wastage,
      fine: totals.fine,
      majuri: totals.majuri,
      hsnCode: line.hsnCode || item.gst_hsn_code || '',
      gstRate,
      taxableAmount,
      cgstAmount: gstSplit.cgst,
      sgstAmount: gstSplit.sgst,
      igstAmount: gstSplit.igst
    }
  })
}

export const estimateService = {
  getNextEstimateNo() {
    return estimateNumberService.getNextEstimateNo()
  },

  create(payload: EstimatePayload) {
    const data = estimateSchema.parse(payload)
    const db = getDatabase()

    const estimateId = uuidv4()
    const estimateNo = estimateNumberService.getNextEstimateNo()
    const estimateDate = data.estimateDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const firm = firmService.get()
    const accountState = getAccountState(data.accountId)
    const interState = isInterState(firm.state, accountState)

    const preparedItemLines = prepareItemLines(data.itemLines, interState)

    const itemFineTotal = preparedItemLines.reduce((total, line) => total + line.fine, 0)
    const itemMajuriTotal = preparedItemLines.reduce((total, line) => total + line.majuri, 0)
    const taxableAmountTotal = roundMoney(
      preparedItemLines.reduce((total, line) => total + line.taxableAmount, 0)
    )
    const cgstAmountTotal = roundMoney(
      preparedItemLines.reduce((total, line) => total + line.cgstAmount, 0)
    )
    const sgstAmountTotal = roundMoney(
      preparedItemLines.reduce((total, line) => total + line.sgstAmount, 0)
    )
    const igstAmountTotal = roundMoney(
      preparedItemLines.reduce((total, line) => total + line.igstAmount, 0)
    )

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO estimate_headers (
          id,
          estimate_no,
          estimate_date,
          account_id,
          phone,
          metal_type,
          narration,
          valid_until,
          item_fine_total,
          item_majuri_total,
          taxable_amount,
          cgst_amount,
          sgst_amount,
          igst_amount,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        estimateId,
        estimateNo,
        estimateDate,
        data.accountId,
        data.phone,
        data.metalType,
        data.narration,
        data.validUntil,
        itemFineTotal,
        itemMajuriTotal,
        taxableAmountTotal,
        cgstAmountTotal,
        sgstAmountTotal,
        igstAmountTotal,
        'OPEN',
        now,
        now
      )

      for (const line of preparedItemLines) {
        db.prepare(
          `
          INSERT INTO estimate_item_lines (
            id,
            estimate_id,
            line_no,
            item_id,
            stamp_id,
            design_id,
            item_name_snapshot,
            barcode,
            remark,
            pcs,
            gross_weight,
            net_weight,
            tunch,
            wastage,
            fine,
            majuri,
            hsn_code,
            gst_rate,
            taxable_amount,
            cgst_amount,
            sgst_amount,
            igst_amount,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          line.id,
          estimateId,
          line.lineNo,
          line.itemId,
          emptyToNull(line.stampId),
          emptyToNull(line.designId),
          line.item.item_name,
          line.barcode,
          line.remark,
          line.pcs,
          line.grossWeight,
          line.netWeight,
          line.tunch,
          line.wastage,
          line.fine,
          line.majuri,
          line.hsnCode,
          line.gstRate,
          line.taxableAmount,
          line.cgstAmount,
          line.sgstAmount,
          line.igstAmount,
          now,
          now
        )
      }
    })

    transaction()

    return this.getById(estimateId)
  },

  update(id: string, payload: EstimatePayload) {
    const data = estimateSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = db
      .prepare(
        `
        SELECT id, status
        FROM estimate_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as { id: string; status: string } | undefined

    if (!existing) {
      throw new Error('Estimate not found')
    }

    if (existing.status !== 'OPEN') {
      throw new Error('Only an open estimate can be edited')
    }

    const estimateDate = data.estimateDate || dayjs().format('YYYY-MM-DD')

    const firm = firmService.get()
    const accountState = getAccountState(data.accountId)
    const interState = isInterState(firm.state, accountState)

    const preparedItemLines = prepareItemLines(data.itemLines, interState)

    const itemFineTotal = preparedItemLines.reduce((total, line) => total + line.fine, 0)
    const itemMajuriTotal = preparedItemLines.reduce((total, line) => total + line.majuri, 0)
    const taxableAmountTotal = roundMoney(
      preparedItemLines.reduce((total, line) => total + line.taxableAmount, 0)
    )
    const cgstAmountTotal = roundMoney(
      preparedItemLines.reduce((total, line) => total + line.cgstAmount, 0)
    )
    const sgstAmountTotal = roundMoney(
      preparedItemLines.reduce((total, line) => total + line.sgstAmount, 0)
    )
    const igstAmountTotal = roundMoney(
      preparedItemLines.reduce((total, line) => total + line.igstAmount, 0)
    )

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE estimate_headers
        SET
          estimate_date = ?,
          account_id = ?,
          phone = ?,
          metal_type = ?,
          narration = ?,
          valid_until = ?,
          item_fine_total = ?,
          item_majuri_total = ?,
          taxable_amount = ?,
          cgst_amount = ?,
          sgst_amount = ?,
          igst_amount = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        estimateDate,
        data.accountId,
        data.phone,
        data.metalType,
        data.narration,
        data.validUntil,
        itemFineTotal,
        itemMajuriTotal,
        taxableAmountTotal,
        cgstAmountTotal,
        sgstAmountTotal,
        igstAmountTotal,
        now,
        id
      )

      db.prepare(
        `
        DELETE FROM estimate_item_lines
        WHERE estimate_id = ?
      `
      ).run(id)

      for (const line of preparedItemLines) {
        db.prepare(
          `
          INSERT INTO estimate_item_lines (
            id,
            estimate_id,
            line_no,
            item_id,
            stamp_id,
            design_id,
            item_name_snapshot,
            barcode,
            remark,
            pcs,
            gross_weight,
            net_weight,
            tunch,
            wastage,
            fine,
            majuri,
            hsn_code,
            gst_rate,
            taxable_amount,
            cgst_amount,
            sgst_amount,
            igst_amount,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          line.id,
          id,
          line.lineNo,
          line.itemId,
          emptyToNull(line.stampId),
          emptyToNull(line.designId),
          line.item.item_name,
          line.barcode,
          line.remark,
          line.pcs,
          line.grossWeight,
          line.netWeight,
          line.tunch,
          line.wastage,
          line.fine,
          line.majuri,
          line.hsnCode,
          line.gstRate,
          line.taxableAmount,
          line.cgstAmount,
          line.sgstAmount,
          line.igstAmount,
          now,
          now
        )
      }
    })

    transaction()

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const estimate = db
      .prepare(
        `
        SELECT id, estimate_no, status
        FROM estimate_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as { id: string; estimate_no: string; status: string } | undefined

    if (!estimate) {
      throw new Error('Estimate not found')
    }

    if (estimate.status !== 'OPEN') {
      throw new Error('Only an open estimate can be deleted')
    }

    db.prepare(
      `
      UPDATE estimate_headers
      SET
        deleted_at = ?,
        updated_at = ?,
        narration = TRIM(COALESCE(narration, '') || ?)
      WHERE id = ?
    `
    ).run(now, now, ` Deleted on ${now}`, id)

    return {
      success: true,
      estimateNo: estimate.estimate_no
    }
  },

  list() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          eh.id,
          eh.estimate_no,
          eh.estimate_date,
          eh.metal_type,
          eh.item_fine_total,
          eh.item_majuri_total,
          eh.taxable_amount,
          eh.cgst_amount,
          eh.sgst_amount,
          eh.igst_amount,
          eh.status,
          a.account_name,
          a.mobile_number
        FROM estimate_headers eh
        INNER JOIN accounts a ON a.id = eh.account_id
        WHERE eh.deleted_at IS NULL
        ORDER BY eh.estimate_date DESC, eh.created_at DESC
      `
      )
      .all()
  },

  getById(id: string) {
    const db = getDatabase()

    const header = getEstimateHeaderRow(id)

    if (!header) {
      throw new Error('Estimate not found')
    }

    const itemLines = db
      .prepare(
        `
        SELECT *
        FROM estimate_item_lines
        WHERE estimate_id = ?
        ORDER BY line_no ASC
      `
      )
      .all(id)

    return {
      header,
      itemLines
    }
  },

  convertToSale(estimateId: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const estimate = db
      .prepare(
        `
        SELECT *
        FROM estimate_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(estimateId) as
      | {
          id: string
          estimate_no: string
          estimate_date: string
          account_id: string
          phone: string
          metal_type: 'Gold' | 'Silver' | 'Diamond' | 'Other'
          narration: string
          status: string
        }
      | undefined

    if (!estimate) {
      throw new Error('Estimate not found')
    }

    if (estimate.status !== 'OPEN') {
      throw new Error('Only an open estimate can be converted to a sale')
    }

    const lines = db
      .prepare(
        `
        SELECT *
        FROM estimate_item_lines
        WHERE estimate_id = ?
        ORDER BY line_no ASC
      `
      )
      .all(estimateId) as Array<{
      item_id: string
      stamp_id: string | null
      design_id: string | null
      barcode: string
      remark: string
      pcs: number
      gross_weight: number
      net_weight: number
      tunch: number
      wastage: number
      majuri: number
    }>

    if (lines.length === 0) {
      throw new Error('This estimate has no item to convert')
    }

    const convertedNarrationSuffix = estimate.narration ? ' - ' + estimate.narration : ''

    // Estimate item lines do not persist pack weight / labour rate (only the final net
    // weight, fine and majuri amounts). To reproduce identical fine and majuri on the
    // resulting sale, we back-derive equivalent sale-entry inputs: packWeight = 0 with
    // addWeight = (netWeight - grossWeight) reproduces the same net weight, and
    // labourRateType = 'Pcs' with labourRate = majuri / pcs reproduces the same majuri.
    const salePayload = {
      saleDate: dayjs().format('YYYY-MM-DD'),
      accountId: estimate.account_id,
      phone: estimate.phone,
      metalType: estimate.metal_type,
      haste: '',
      dpNo: '',
      narration: 'Converted from Estimate ' + estimate.estimate_no + convertedNarrationSuffix,
      reminderDate: '',
      itemLines: lines.map((line) => ({
        lineType: 'NAVE',
        itemId: line.item_id,
        stampId: line.stamp_id || '',
        designId: line.design_id || '',
        barcode: line.barcode || '',
        remark: line.remark || '',
        pcs: line.pcs,
        grossWeight: line.gross_weight,
        addWeight: line.net_weight - line.gross_weight,
        packWeight: 0,
        tunch: line.tunch,
        wastage: line.wastage,
        unit: 'GM',
        labourRate: line.pcs > 0 ? line.majuri / line.pcs : 0,
        labourRateType: 'Pcs' as LabourRateType
      })),
      paymentLines: []
    }

    const createdSale = saleService.create(salePayload) as {
      header: { id: string; sale_no: string }
      itemLines: unknown[]
      paymentLines: unknown[]
    }

    // estimate_headers has no converted_sale_id / converted_at column, so the link to the
    // resulting sale bill is recorded as a narration note instead of a foreign key column.
    db.prepare(
      `
      UPDATE estimate_headers
      SET
        status = 'CONVERTED',
        updated_at = ?,
        narration = TRIM(COALESCE(narration, '') || ?)
      WHERE id = ?
    `
    ).run(now, ` Converted to Sale ${createdSale.header.sale_no} on ${now}`, estimateId)

    return {
      estimate: this.getById(estimateId),
      sale: createdSale
    }
  }
}
