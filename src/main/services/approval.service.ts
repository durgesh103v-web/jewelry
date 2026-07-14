import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { calculateSaleItemTotals, type LabourRateType } from './jewelleryFormula.service'
import { approvalNumberService } from './approvalNumber.service'
import { saleService } from './sale.service'

const approvalItemLineSchema = z.object({
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
  unit: z.string().trim().optional().default('GM'),
  labourRate: z.coerce.number().optional(),
  labourRateType: z.enum(['Kg', 'Gm', 'Pcs']).optional()
})

const approvalSchema = z.object({
  approvalDate: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  phone: z.string().trim().optional().default(''),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']).default('Silver'),
  narration: z.string().trim().optional().default(''),
  reminderDate: z.string().trim().optional().default(''),
  itemLines: z.array(approvalItemLineSchema).min(1, 'At least one item is required')
})

type ApprovalPayload = z.infer<typeof approvalSchema>

const returnApprovalSchema = z.object({
  lineIds: z.array(z.string().trim().min(1)).optional().default([]),
  returnAll: z.boolean().optional().default(false),
  narration: z.string().trim().optional().default('')
})

type ReturnApprovalPayload = z.infer<typeof returnApprovalSchema>

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
}

function emptyToNull(value: string): string | null {
  return value.trim() ? value.trim() : null
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
        labour_rate_type
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

function getApprovalHeaderRow(id: string): Record<string, unknown> | undefined {
  const db = getDatabase()

  return db
    .prepare(
      `
      SELECT
        ah.*,
        a.account_name,
        a.mobile_number
      FROM approval_headers ah
      INNER JOIN accounts a ON a.id = ah.account_id
      WHERE ah.id = ?
      AND ah.deleted_at IS NULL
    `
    )
    .get(id) as Record<string, unknown> | undefined
}

function prepareItemLines(itemLines: ApprovalPayload['itemLines']): Array<{
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
  packWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  tunch: number
  wastage: number
  hishob: number
  unit: string
  labourRate: number
  labourRateType: LabourRateType
  fine: number
  majuri: number
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
      packWeight,
      lessWeight: totals.lessWeight,
      addWeight: line.addWeight,
      netWeight: totals.netWeight,
      tunch,
      wastage,
      hishob: totals.hishob,
      unit: line.unit || 'GM',
      labourRate,
      labourRateType,
      fine: totals.fine,
      majuri: totals.majuri
    }
  })
}

export const approvalService = {
  getNextApprovalNo() {
    return approvalNumberService.getNextApprovalNo()
  },

  create(payload: ApprovalPayload) {
    const data = approvalSchema.parse(payload)
    const db = getDatabase()

    const approvalId = uuidv4()
    const approvalNo = approvalNumberService.getNextApprovalNo()
    const approvalDate = data.approvalDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const preparedItemLines = prepareItemLines(data.itemLines)

    const itemFineTotal = preparedItemLines.reduce((total, line) => total + line.fine, 0)
    const itemMajuriTotal = preparedItemLines.reduce((total, line) => total + line.majuri, 0)

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO approval_headers (
          id,
          approval_no,
          approval_date,
          account_id,
          phone,
          metal_type,
          narration,
          reminder_date,
          item_fine_total,
          item_majuri_total,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        approvalId,
        approvalNo,
        approvalDate,
        data.accountId,
        data.phone,
        data.metalType,
        data.narration,
        data.reminderDate,
        itemFineTotal,
        itemMajuriTotal,
        'pending',
        now,
        now
      )

      for (const line of preparedItemLines) {
        db.prepare(
          `
          INSERT INTO approval_item_lines (
            id,
            approval_id,
            line_no,
            item_id,
            stamp_id,
            design_id,
            item_name_snapshot,
            barcode,
            remark,
            pcs,
            gross_weight,
            pack_weight,
            less_weight,
            add_weight,
            net_weight,
            tunch,
            wastage,
            hishob,
            unit,
            labour_rate,
            labour_rate_type,
            fine,
            majuri,
            return_status,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          line.id,
          approvalId,
          line.lineNo,
          line.itemId,
          emptyToNull(line.stampId),
          emptyToNull(line.designId),
          line.item.item_name,
          line.barcode,
          line.remark,
          line.pcs,
          line.grossWeight,
          line.packWeight,
          line.lessWeight,
          line.addWeight,
          line.netWeight,
          line.tunch,
          line.wastage,
          line.hishob,
          line.unit,
          line.labourRate,
          line.labourRateType,
          line.fine,
          line.majuri,
          'pending',
          now,
          now
        )
      }
    })

    transaction()

    return this.getById(approvalId)
  },

  update(id: string, payload: ApprovalPayload) {
    const data = approvalSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = db
      .prepare(
        `
        SELECT id, status
        FROM approval_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as { id: string; status: string } | undefined

    if (!existing) {
      throw new Error('Approval not found')
    }

    if (existing.status !== 'pending') {
      throw new Error('Only a pending approval can be edited')
    }

    const approvalDate = data.approvalDate || dayjs().format('YYYY-MM-DD')
    const preparedItemLines = prepareItemLines(data.itemLines)

    const itemFineTotal = preparedItemLines.reduce((total, line) => total + line.fine, 0)
    const itemMajuriTotal = preparedItemLines.reduce((total, line) => total + line.majuri, 0)

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE approval_headers
        SET
          approval_date = ?,
          account_id = ?,
          phone = ?,
          metal_type = ?,
          narration = ?,
          reminder_date = ?,
          item_fine_total = ?,
          item_majuri_total = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        approvalDate,
        data.accountId,
        data.phone,
        data.metalType,
        data.narration,
        data.reminderDate,
        itemFineTotal,
        itemMajuriTotal,
        now,
        id
      )

      db.prepare(
        `
        DELETE FROM approval_item_lines
        WHERE approval_id = ?
      `
      ).run(id)

      for (const line of preparedItemLines) {
        db.prepare(
          `
          INSERT INTO approval_item_lines (
            id,
            approval_id,
            line_no,
            item_id,
            stamp_id,
            design_id,
            item_name_snapshot,
            barcode,
            remark,
            pcs,
            gross_weight,
            pack_weight,
            less_weight,
            add_weight,
            net_weight,
            tunch,
            wastage,
            hishob,
            unit,
            labour_rate,
            labour_rate_type,
            fine,
            majuri,
            return_status,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          line.packWeight,
          line.lessWeight,
          line.addWeight,
          line.netWeight,
          line.tunch,
          line.wastage,
          line.hishob,
          line.unit,
          line.labourRate,
          line.labourRateType,
          line.fine,
          line.majuri,
          'pending',
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

    const approval = db
      .prepare(
        `
        SELECT id, approval_no, status
        FROM approval_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as { id: string; approval_no: string; status: string } | undefined

    if (!approval) {
      throw new Error('Approval not found')
    }

    if (approval.status !== 'pending') {
      throw new Error('Only a pending approval can be deleted')
    }

    db.prepare(
      `
      UPDATE approval_headers
      SET
        deleted_at = ?,
        updated_at = ?,
        narration = TRIM(COALESCE(narration, '') || ?)
      WHERE id = ?
    `
    ).run(now, now, ` Deleted on ${now}`, id)

    return {
      success: true,
      approvalNo: approval.approval_no
    }
  },

  list() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          ah.id,
          ah.approval_no,
          ah.approval_date,
          ah.metal_type,
          ah.item_fine_total,
          ah.item_majuri_total,
          ah.status,
          ah.converted_sale_id,
          a.account_name,
          a.mobile_number
        FROM approval_headers ah
        INNER JOIN accounts a ON a.id = ah.account_id
        WHERE ah.deleted_at IS NULL
        ORDER BY ah.approval_date DESC, ah.created_at DESC
      `
      )
      .all()
  },

  getById(id: string) {
    const db = getDatabase()

    const header = getApprovalHeaderRow(id)

    if (!header) {
      throw new Error('Approval not found')
    }

    const itemLines = db
      .prepare(
        `
        SELECT *
        FROM approval_item_lines
        WHERE approval_id = ?
        ORDER BY line_no ASC
      `
      )
      .all(id)

    return {
      header,
      itemLines
    }
  },

  convertToSale(approvalId: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const approval = db
      .prepare(
        `
        SELECT *
        FROM approval_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(approvalId) as
      | {
          id: string
          approval_no: string
          approval_date: string
          account_id: string
          phone: string
          metal_type: 'Gold' | 'Silver' | 'Diamond' | 'Other'
          narration: string
          reminder_date: string
          status: string
        }
      | undefined

    if (!approval) {
      throw new Error('Approval not found')
    }

    if (approval.status === 'approved') {
      throw new Error('This approval has already been converted to a sale')
    }

    if (approval.status === 'returned') {
      throw new Error('This approval has already been fully returned')
    }

    const lines = db
      .prepare(
        `
        SELECT *
        FROM approval_item_lines
        WHERE approval_id = ?
        AND return_status = 'pending'
        ORDER BY line_no ASC
      `
      )
      .all(approvalId) as Array<{
      item_id: string
      stamp_id: string | null
      design_id: string | null
      barcode: string
      remark: string
      pcs: number
      gross_weight: number
      pack_weight: number
      add_weight: number
      tunch: number
      wastage: number
      unit: string
      labour_rate: number
      labour_rate_type: LabourRateType
    }>

    if (lines.length === 0) {
      throw new Error('No pending item is left on this approval to convert')
    }

    const convertedNarrationSuffix = approval.narration ? ' - ' + approval.narration : ''

    const salePayload = {
      saleDate: dayjs().format('YYYY-MM-DD'),
      accountId: approval.account_id,
      phone: approval.phone,
      metalType: approval.metal_type,
      haste: '',
      dpNo: '',
      narration: 'Converted from Approval ' + approval.approval_no + convertedNarrationSuffix,
      reminderDate: approval.reminder_date,
      itemLines: lines.map((line) => ({
        lineType: 'NAVE',
        itemId: line.item_id,
        stampId: line.stamp_id || '',
        designId: line.design_id || '',
        barcode: line.barcode || '',
        remark: line.remark || '',
        pcs: line.pcs,
        grossWeight: line.gross_weight,
        addWeight: line.add_weight,
        packWeight: line.pack_weight,
        tunch: line.tunch,
        wastage: line.wastage,
        unit: line.unit,
        labourRate: line.labour_rate,
        labourRateType: line.labour_rate_type
      })),
      paymentLines: []
    }

    const createdSale = saleService.create(salePayload) as {
      header: { id: string; sale_no: string }
      itemLines: unknown[]
      paymentLines: unknown[]
    }

    db.prepare(
      `
      UPDATE approval_headers
      SET
        status = 'approved',
        converted_sale_id = ?,
        converted_at = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(createdSale.header.id, now, now, approvalId)

    return {
      approval: this.getById(approvalId),
      sale: createdSale
    }
  },

  returnApproval(approvalId: string, payload: ReturnApprovalPayload) {
    const data = returnApprovalSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const approval = db
      .prepare(
        `
        SELECT id, status, narration
        FROM approval_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(approvalId) as { id: string; status: string; narration: string } | undefined

    if (!approval) {
      throw new Error('Approval not found')
    }

    if (approval.status === 'approved') {
      throw new Error('Cannot return an approval that has already been converted to a sale')
    }

    if (approval.status === 'returned') {
      throw new Error('This approval has already been fully returned')
    }

    const allLines = db
      .prepare(
        `
        SELECT id, return_status
        FROM approval_item_lines
        WHERE approval_id = ?
        ORDER BY line_no ASC
      `
      )
      .all(approvalId) as Array<{ id: string; return_status: string }>

    const pendingLineIds = allLines
      .filter((line) => line.return_status === 'pending')
      .map((line) => line.id)

    const targetLineIds = data.returnAll
      ? pendingLineIds
      : data.lineIds.filter((lineId) => pendingLineIds.includes(lineId))

    if (targetLineIds.length === 0) {
      throw new Error('Please select at least one pending item line to return')
    }

    const transaction = db.transaction(() => {
      const placeholders = targetLineIds.map(() => '?').join(', ')

      db.prepare(
        `
        UPDATE approval_item_lines
        SET
          return_status = 'returned',
          updated_at = ?
        WHERE approval_id = ?
        AND id IN (${placeholders})
      `
      ).run(now, approvalId, ...targetLineIds)

      const remainingPending = allLines.filter(
        (line) => !targetLineIds.includes(line.id) && line.return_status === 'pending'
      ).length

      const nextStatus = remainingPending === 0 ? 'returned' : 'partial_return'
      const nextNarration = data.narration
        ? [approval.narration, data.narration].filter(Boolean).join(' ').trim()
        : approval.narration

      db.prepare(
        `
        UPDATE approval_headers
        SET
          status = ?,
          returned_at = ?,
          updated_at = ?,
          narration = ?
        WHERE id = ?
      `
      ).run(nextStatus, now, now, nextNarration, approvalId)
    })

    transaction()

    return this.getById(approvalId)
  }
}
