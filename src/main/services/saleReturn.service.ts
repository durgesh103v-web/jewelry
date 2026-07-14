import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { accountBalanceService } from './accountBalance.service'
import {
  calculateSaleItemTotals,
  roundNumber,
  type LabourRateType
} from './jewelleryFormula.service'
import { saleReturnNumberService } from './saleReturnNumber.service'

const saleReturnItemLineSchema = z.object({
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

const saleReturnSchema = z.object({
  returnNo: z.string().trim().optional().default(''),
  returnDate: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  phone: z.string().trim().optional().default(''),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']).default('Silver'),
  againstSaleId: z.string().trim().optional().default(''),
  narration: z.string().trim().optional().default(''),
  itemLines: z.array(saleReturnItemLineSchema).min(1, 'At least one item is required')
})

type SaleReturnPayload = z.infer<typeof saleReturnSchema>

type AccountRow = {
  id: string
}

type SaleRow = {
  id: string
  sale_no: string
}

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

type SaleReturnHeaderRow = {
  id: string
  return_no: string
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

function prepareItemLines(itemLines: SaleReturnPayload['itemLines']): Array<{
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

function getSaleReturnHeaderRow(id: string): Record<string, unknown> | undefined {
  const db = getDatabase()

  return db
    .prepare(
      `
      SELECT
        srh.*,
        a.account_name,
        a.mobile_number,
        sh.sale_no AS against_sale_no
      FROM sale_return_headers srh
      INNER JOIN accounts a ON a.id = srh.account_id
      LEFT JOIN sale_headers sh ON sh.id = srh.against_sale_id
      WHERE srh.id = ?
      AND srh.deleted_at IS NULL
    `
    )
    .get(id) as Record<string, unknown> | undefined
}

function assertAccountExists(accountId: string): void {
  const db = getDatabase()

  const account = db
    .prepare(
      `
      SELECT id
      FROM accounts
      WHERE id = ?
      AND deleted_at IS NULL
    `
    )
    .get(accountId) as AccountRow | undefined

  if (!account) {
    throw new Error('Account not found')
  }
}

function resolveAgainstSaleId(againstSaleId: string): string | null {
  if (!againstSaleId.trim()) {
    return null
  }

  const db = getDatabase()

  const sale = db
    .prepare(
      `
      SELECT id, sale_no
      FROM sale_headers
      WHERE id = ?
      AND deleted_at IS NULL
    `
    )
    .get(againstSaleId) as SaleRow | undefined

  if (!sale) {
    throw new Error('The selected original sale was not found')
  }

  return sale.id
}

export const saleReturnService = {
  getNextSaleReturnNo() {
    return saleReturnNumberService.getNextSaleReturnNo()
  },

  getAccountBalance(accountId: string) {
    return accountBalanceService.getAccountBalance(accountId)
  },

  create(payload: SaleReturnPayload) {
    const data = saleReturnSchema.parse(payload)
    const db = getDatabase()

    assertAccountExists(data.accountId)
    const againstSaleId = resolveAgainstSaleId(data.againstSaleId)

    const saleReturnId = uuidv4()
    const returnNo = data.returnNo || saleReturnNumberService.getNextSaleReturnNo()
    const returnDate = data.returnDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const oldBalance = accountBalanceService.getAccountBalance(data.accountId)

    const preparedItemLines = prepareItemLines(data.itemLines)

    const itemFineTotal = roundNumber(
      preparedItemLines.reduce((total, line) => total + line.fine, 0)
    )
    const itemMajuriTotal = roundNumber(
      preparedItemLines.reduce((total, line) => total + line.majuri, 0),
      0
    )

    // Sale Return is the mirror image of a Sale: a Sale posts fine_nave/
    // cash_nave (which add to the running balance the customer owes). A
    // return posts the same totals as fine_jama/cash_jama, which subtract
    // from the balance - exactly reversing what the original Sale did.
    const closingGoldFine =
      data.metalType === 'Gold'
        ? roundNumber(oldBalance.goldFine - itemFineTotal)
        : oldBalance.goldFine
    const closingSilverFine =
      data.metalType === 'Silver'
        ? roundNumber(oldBalance.silverFine - itemFineTotal)
        : oldBalance.silverFine
    const closingCash = roundNumber(oldBalance.cash - itemMajuriTotal, 0)
    const closingBank = oldBalance.bank
    const closingAnamat = oldBalance.anamat

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO sale_return_headers (
          id,
          return_no,
          return_date,
          account_id,
          phone,
          metal_type,
          against_sale_id,
          narration,
          old_gold_fine,
          old_silver_fine,
          old_cash,
          old_anamat,
          old_bank,
          item_fine_total,
          item_majuri_total,
          closing_gold_fine,
          closing_silver_fine,
          closing_cash,
          closing_anamat,
          closing_bank,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        saleReturnId,
        returnNo,
        returnDate,
        data.accountId,
        data.phone,
        data.metalType,
        againstSaleId,
        data.narration,
        oldBalance.goldFine,
        oldBalance.silverFine,
        oldBalance.cash,
        oldBalance.anamat,
        oldBalance.bank,
        itemFineTotal,
        itemMajuriTotal,
        closingGoldFine,
        closingSilverFine,
        closingCash,
        closingAnamat,
        closingBank,
        now,
        now
      )

      for (const line of preparedItemLines) {
        db.prepare(
          `
          INSERT INTO sale_return_item_lines (
            id,
            sale_return_id,
            line_no,
            line_type,
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
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          line.id,
          saleReturnId,
          line.lineNo,
          'JAMA',
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
          now,
          now
        )

        // Reverse of Sale's Stock-: Sale Return adds back stock that was
        // previously removed (positive deltas).
        db.prepare(
          `
          INSERT INTO stock_ledger (
            id,
            source_type,
            source_id,
            entry_date,
            item_id,
            stamp_id,
            design_id,
            metal_type,
            pcs_delta,
            gross_weight_delta,
            net_weight_delta,
            fine_delta,
            narration,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          uuidv4(),
          'SALE_RETURN',
          saleReturnId,
          returnDate,
          line.itemId,
          emptyToNull(line.stampId),
          emptyToNull(line.designId),
          data.metalType,
          line.pcs,
          line.grossWeight,
          line.netWeight,
          line.fine,
          `Sale Return ${returnNo} - ${line.item.item_name}`,
          now
        )
      }

      // Reverse of Sale's Nave (debit): Sale Return posts a Jama (credit)
      // entry tied to the returned fine/majuri totals.
      db.prepare(
        `
        INSERT INTO account_ledger (
          id,
          source_type,
          source_id,
          entry_date,
          account_id,
          metal_type,
          fine_jama,
          cash_jama,
          narration,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        uuidv4(),
        'SALE_RETURN',
        saleReturnId,
        returnDate,
        data.accountId,
        data.metalType,
        itemFineTotal,
        itemMajuriTotal,
        `Sale Return ${returnNo}`,
        now
      )
    })

    transaction()

    return this.getById(saleReturnId)
  },

  update(id: string, payload: SaleReturnPayload) {
    const data = saleReturnSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = db
      .prepare(
        `
        SELECT id
        FROM sale_return_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as { id: string } | undefined

    if (!existing) {
      throw new Error('Sale return not found')
    }

    assertAccountExists(data.accountId)
    const againstSaleId = resolveAgainstSaleId(data.againstSaleId)

    const returnDate = data.returnDate || dayjs().format('YYYY-MM-DD')
    const returnNoRow = db
      .prepare(`SELECT return_no FROM sale_return_headers WHERE id = ?`)
      .get(id) as { return_no: string }
    const returnNo = returnNoRow.return_no

    const preparedItemLines = prepareItemLines(data.itemLines)

    const itemFineTotal = roundNumber(
      preparedItemLines.reduce((total, line) => total + line.fine, 0)
    )
    const itemMajuriTotal = roundNumber(
      preparedItemLines.reduce((total, line) => total + line.majuri, 0),
      0
    )

    const transaction = db.transaction(() => {
      db.prepare(
        `
        DELETE FROM stock_ledger
        WHERE source_type = 'SALE_RETURN'
        AND source_id = ?
      `
      ).run(id)

      db.prepare(
        `
        DELETE FROM account_ledger
        WHERE source_type = 'SALE_RETURN'
        AND source_id = ?
      `
      ).run(id)

      db.prepare(
        `
        DELETE FROM sale_return_item_lines
        WHERE sale_return_id = ?
      `
      ).run(id)

      const oldBalance = accountBalanceService.getAccountBalance(data.accountId)

      const closingGoldFine =
        data.metalType === 'Gold'
          ? roundNumber(oldBalance.goldFine - itemFineTotal)
          : oldBalance.goldFine
      const closingSilverFine =
        data.metalType === 'Silver'
          ? roundNumber(oldBalance.silverFine - itemFineTotal)
          : oldBalance.silverFine
      const closingCash = roundNumber(oldBalance.cash - itemMajuriTotal, 0)

      db.prepare(
        `
        UPDATE sale_return_headers
        SET
          return_date = ?,
          account_id = ?,
          phone = ?,
          metal_type = ?,
          against_sale_id = ?,
          narration = ?,
          old_gold_fine = ?,
          old_silver_fine = ?,
          old_cash = ?,
          old_anamat = ?,
          old_bank = ?,
          item_fine_total = ?,
          item_majuri_total = ?,
          closing_gold_fine = ?,
          closing_silver_fine = ?,
          closing_cash = ?,
          closing_anamat = ?,
          closing_bank = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        returnDate,
        data.accountId,
        data.phone,
        data.metalType,
        againstSaleId,
        data.narration,
        oldBalance.goldFine,
        oldBalance.silverFine,
        oldBalance.cash,
        oldBalance.anamat,
        oldBalance.bank,
        itemFineTotal,
        itemMajuriTotal,
        closingGoldFine,
        closingSilverFine,
        closingCash,
        oldBalance.anamat,
        oldBalance.bank,
        now,
        id
      )

      for (const line of preparedItemLines) {
        db.prepare(
          `
          INSERT INTO sale_return_item_lines (
            id,
            sale_return_id,
            line_no,
            line_type,
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
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          line.id,
          id,
          line.lineNo,
          'JAMA',
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
          now,
          now
        )

        db.prepare(
          `
          INSERT INTO stock_ledger (
            id,
            source_type,
            source_id,
            entry_date,
            item_id,
            stamp_id,
            design_id,
            metal_type,
            pcs_delta,
            gross_weight_delta,
            net_weight_delta,
            fine_delta,
            narration,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          uuidv4(),
          'SALE_RETURN',
          id,
          returnDate,
          line.itemId,
          emptyToNull(line.stampId),
          emptyToNull(line.designId),
          data.metalType,
          line.pcs,
          line.grossWeight,
          line.netWeight,
          line.fine,
          `Sale Return ${returnNo} - ${line.item.item_name}`,
          now
        )
      }

      db.prepare(
        `
        INSERT INTO account_ledger (
          id,
          source_type,
          source_id,
          entry_date,
          account_id,
          metal_type,
          fine_jama,
          cash_jama,
          narration,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        uuidv4(),
        'SALE_RETURN',
        id,
        returnDate,
        data.accountId,
        data.metalType,
        itemFineTotal,
        itemMajuriTotal,
        `Sale Return ${returnNo}`,
        now
      )
    })

    transaction()

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const saleReturn = db
      .prepare(
        `
        SELECT id, return_no
        FROM sale_return_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as SaleReturnHeaderRow | undefined

    if (!saleReturn) {
      throw new Error('Sale return not found')
    }

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE sale_return_headers
        SET
          deleted_at = ?,
          updated_at = ?,
          narration = TRIM(COALESCE(narration, '') || ?)
        WHERE id = ?
      `
      ).run(now, now, ` Voided on ${now}`, id)

      db.prepare(
        `
        DELETE FROM stock_ledger
        WHERE source_type = 'SALE_RETURN'
        AND source_id = ?
      `
      ).run(id)

      db.prepare(
        `
        DELETE FROM account_ledger
        WHERE source_type = 'SALE_RETURN'
        AND source_id = ?
      `
      ).run(id)
    })

    transaction()

    return {
      success: true,
      returnNo: saleReturn.return_no
    }
  },

  list() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          srh.id,
          srh.return_no AS returnNo,
          srh.return_date AS returnDate,
          srh.account_id AS accountId,
          a.account_name AS accountName,
          a.mobile_number AS mobileNumber,
          srh.metal_type AS metalType,
          srh.against_sale_id AS againstSaleId,
          sh.sale_no AS againstSaleNo,
          srh.item_fine_total AS itemFineTotal,
          srh.item_majuri_total AS itemMajuriTotal,
          srh.closing_gold_fine AS closingGoldFine,
          srh.closing_silver_fine AS closingSilverFine,
          srh.closing_cash AS closingCash,
          srh.narration AS narration,
          srh.created_at AS createdAt
        FROM sale_return_headers srh
        INNER JOIN accounts a ON a.id = srh.account_id
        LEFT JOIN sale_headers sh ON sh.id = srh.against_sale_id
        WHERE srh.deleted_at IS NULL
        ORDER BY srh.return_date DESC, srh.created_at DESC
      `
      )
      .all()
  },

  getById(id: string) {
    const db = getDatabase()

    const header = getSaleReturnHeaderRow(id)

    if (!header) {
      throw new Error('Sale return not found')
    }

    const itemLines = db
      .prepare(
        `
        SELECT *
        FROM sale_return_item_lines
        WHERE sale_return_id = ?
        ORDER BY line_no ASC
      `
      )
      .all(id)

    return {
      header,
      itemLines
    }
  }
}
