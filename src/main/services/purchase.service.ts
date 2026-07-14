import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { accountBalanceService } from './accountBalance.service'
import {
  calculateFine,
  calculateHishob,
  calculateSaleItemTotals,
  roundNumber,
  type LabourRateType
} from './jewelleryFormula.service'
import { purchaseNumberService } from './purchaseNumber.service'

const purchaseItemLineSchema = z.object({
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

const purchasePaymentLineSchema = z.object({
  type: z.string().trim().optional().default(''),
  details: z.string().trim().optional().default(''),
  pcs: z.coerce.number().default(0),
  weight: z.coerce.number().default(0),
  tanch: z.coerce.number().default(0),
  wastage: z.coerce.number().default(0),
  rate: z.coerce.number().default(0),
  fineAmount: z.coerce.number().default(0),
  anamat: z.coerce.number().default(0),
  cash: z.coerce.number().default(0),
  bank: z.coerce.number().default(0),
  accountId: z.string().trim().optional().default('')
})

const purchaseSchema = z.object({
  purchaseNo: z.string().trim().optional().default(''),
  purchaseDate: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  phone: z.string().trim().optional().default(''),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']).default('Silver'),
  haste: z.string().trim().optional().default(''),
  dpNo: z.string().trim().optional().default(''),
  narration: z.string().trim().optional().default(''),
  reminderDate: z.string().trim().optional().default(''),
  itemLines: z.array(purchaseItemLineSchema).min(1, 'At least one item is required'),
  paymentLines: z.array(purchasePaymentLineSchema).optional().default([])
})

type PurchasePayload = z.infer<typeof purchaseSchema>

type AccountRow = {
  id: string
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

type PurchaseHeaderRow = {
  purchase_no: string
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

export const purchaseService = {
  getNextPurchaseNo() {
    return purchaseNumberService.getNextPurchaseNo()
  },

  getAccountBalance(accountId: string) {
    return accountBalanceService.getAccountBalance(accountId)
  },

  create(payload: PurchasePayload) {
    const data = purchaseSchema.parse(payload)
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
      .get(data.accountId) as AccountRow | undefined

    if (!account) {
      throw new Error('Account not found')
    }

    const purchaseId = uuidv4()
    const purchaseNo = data.purchaseNo || purchaseNumberService.getNextPurchaseNo()
    const purchaseDate = data.purchaseDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const oldBalance = accountBalanceService.getAccountBalance(data.accountId)

    const preparedItemLines = data.itemLines.map((line, index) => {
      const item = getItemMeta(line.itemId)
      const packWeight = line.packWeight ?? Number(item.fixed_weight_per_pcs ?? 0)
      const tunch = line.tunch ?? Number(item.default_tanch ?? 0)
      const wastage = line.wastage ?? Number(item.default_wastage ?? 0)
      const labourRate = line.labourRate ?? Number(item.default_labour_rate ?? 0)
      const labourRateType = (line.labourRateType ??
        item.labour_rate_type ??
        'Kg') as LabourRateType

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

    const preparedPaymentLines = data.paymentLines.map((line, index) => {
      const hishob = calculateHishob(line.tanch, line.wastage)
      const fine = calculateFine(line.weight, line.tanch, line.wastage)

      return {
        id: uuidv4(),
        lineNo: index + 1,
        type: line.type || '',
        details: line.details || '',
        pcs: line.pcs,
        weight: line.weight,
        tanch: line.tanch,
        wastage: line.wastage,
        hishob,
        fine,
        rate: line.rate,
        fineAmount: line.fineAmount,
        anamat: line.anamat,
        cash: line.cash,
        bank: line.bank,
        accountId: line.accountId || ''
      }
    })

    const itemFineTotal = roundNumber(
      preparedItemLines.reduce((total, line) => total + line.fine, 0)
    )
    const itemMajuriTotal = roundNumber(
      preparedItemLines.reduce((total, line) => total + line.majuri, 0),
      0
    )
    const paymentFineNaveTotal = roundNumber(
      preparedPaymentLines.reduce((total, line) => total + line.fine, 0)
    )
    const paymentCashNaveTotal = roundNumber(
      preparedPaymentLines.reduce((total, line) => total + line.cash, 0),
      0
    )
    const paymentBankNaveTotal = roundNumber(
      preparedPaymentLines.reduce((total, line) => total + line.bank, 0),
      0
    )
    const paymentAnamatNaveTotal = roundNumber(
      preparedPaymentLines.reduce((total, line) => total + line.anamat, 0),
      0
    )

    const closingGoldFine =
      data.metalType === 'Gold'
        ? roundNumber(oldBalance.goldFine - itemFineTotal + paymentFineNaveTotal)
        : oldBalance.goldFine
    const closingSilverFine =
      data.metalType === 'Silver'
        ? roundNumber(oldBalance.silverFine - itemFineTotal + paymentFineNaveTotal)
        : oldBalance.silverFine
    const closingCash = roundNumber(oldBalance.cash - itemMajuriTotal + paymentCashNaveTotal, 0)
    const closingBank = roundNumber(oldBalance.bank + paymentBankNaveTotal, 0)
    const closingAnamat = roundNumber(oldBalance.anamat + paymentAnamatNaveTotal, 0)

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO purchase_headers (
          id,
          purchase_no,
          purchase_date,
          account_id,
          phone,
          metal_type,
          haste,
          dp_no,
          narration,
          reminder_date,
          old_gold_fine,
          old_silver_fine,
          old_cash,
          old_anamat,
          old_bank,
          item_fine_total,
          item_majuri_total,
          payment_fine_nave_total,
          payment_cash_nave_total,
          payment_bank_nave_total,
          payment_anamat_nave_total,
          closing_gold_fine,
          closing_silver_fine,
          closing_cash,
          closing_anamat,
          closing_bank,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        purchaseId,
        purchaseNo,
        purchaseDate,
        data.accountId,
        data.phone,
        data.metalType,
        data.haste,
        data.dpNo,
        data.narration,
        data.reminderDate,
        oldBalance.goldFine,
        oldBalance.silverFine,
        oldBalance.cash,
        oldBalance.anamat,
        oldBalance.bank,
        itemFineTotal,
        itemMajuriTotal,
        paymentFineNaveTotal,
        paymentCashNaveTotal,
        paymentBankNaveTotal,
        paymentAnamatNaveTotal,
        closingGoldFine,
        closingSilverFine,
        closingCash,
        closingAnamat,
        closingBank,
        now,
        now
      )

      // Prepared statements hoisted out of the loop so each line reuses one
      // compiled statement instead of recompiling the SQL on every iteration.
      const insertPurchaseItemLine = db.prepare(
        `
          INSERT INTO purchase_item_lines (
            id,
            purchase_id,
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
      )
      const insertPurchaseStockLedger = db.prepare(
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
      )

      for (const line of preparedItemLines) {
        insertPurchaseItemLine.run(
          line.id,
          purchaseId,
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

        insertPurchaseStockLedger.run(
          uuidv4(),
          'PURCHASE',
          purchaseId,
          purchaseDate,
          line.itemId,
          emptyToNull(line.stampId),
          emptyToNull(line.designId),
          data.metalType,
          line.pcs,
          line.grossWeight,
          line.netWeight,
          line.fine,
          `Purchase ${purchaseNo} - ${line.item.item_name}`,
          now
        )
      }

      const insertPurchasePaymentLine = db.prepare(
        `
          INSERT INTO purchase_payment_lines (
            id,
            purchase_id,
            line_no,
            type,
            jama_nave,
            details,
            pcs,
            weight,
            tanch,
            wastage,
            hishob,
            fine,
            rate,
            fine_amount,
            anamat,
            cash,
            bank,
            account_id,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )

      for (const line of preparedPaymentLines) {
        insertPurchasePaymentLine.run(
          line.id,
          purchaseId,
          line.lineNo,
          line.type,
          'NAVE',
          line.details,
          line.pcs,
          line.weight,
          line.tanch,
          line.wastage,
          line.hishob,
          line.fine,
          line.rate,
          line.fineAmount,
          line.anamat,
          line.cash,
          line.bank,
          emptyToNull(line.accountId),
          now,
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
        'PURCHASE',
        purchaseId,
        purchaseDate,
        data.accountId,
        data.metalType,
        itemFineTotal,
        itemMajuriTotal,
        `Purchase ${purchaseNo}`,
        now
      )

      if (
        paymentFineNaveTotal > 0 ||
        paymentCashNaveTotal > 0 ||
        paymentBankNaveTotal > 0 ||
        paymentAnamatNaveTotal > 0
      ) {
        db.prepare(
          `
          INSERT INTO account_ledger (
            id,
            source_type,
            source_id,
            entry_date,
            account_id,
            metal_type,
            fine_nave,
            cash_nave,
            bank_nave,
            anamat_nave,
            narration,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          uuidv4(),
          'PURCHASE_PAYMENT',
          purchaseId,
          purchaseDate,
          data.accountId,
          data.metalType,
          paymentFineNaveTotal,
          paymentCashNaveTotal,
          paymentBankNaveTotal,
          paymentAnamatNaveTotal,
          `Purchase payment ${purchaseNo}`,
          now
        )
      }
    })

    transaction()

    return this.getById(purchaseId)
  },

  list() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          ph.id,
          ph.purchase_no AS purchaseNo,
          ph.purchase_date AS purchaseDate,
          ph.account_id AS accountId,
          a.account_name AS accountName,
          a.mobile_number AS mobileNumber,
          ph.metal_type AS metalType,
          ph.item_fine_total AS itemFineTotal,
          ph.item_majuri_total AS itemMajuriTotal,
          ph.payment_fine_nave_total AS paymentFineNaveTotal,
          ph.payment_cash_nave_total AS paymentCashNaveTotal,
          ph.closing_gold_fine AS closingGoldFine,
          ph.closing_silver_fine AS closingSilverFine,
          ph.closing_cash AS closingCash,
          ph.created_at AS createdAt
        FROM purchase_headers ph
        INNER JOIN accounts a ON a.id = ph.account_id
        WHERE ph.deleted_at IS NULL
        ORDER BY ph.purchase_date DESC, ph.created_at DESC
      `
      )
      .all()
  },

  getById(id: string) {
    const db = getDatabase()

    const header = db
      .prepare(
        `
        SELECT
          ph.*,
          a.account_name,
          a.mobile_number
        FROM purchase_headers ph
        INNER JOIN accounts a ON a.id = ph.account_id
        WHERE ph.id = ?
        AND ph.deleted_at IS NULL
      `
      )
      .get(id)

    if (!header) {
      throw new Error('Purchase not found')
    }

    const itemLines = db
      .prepare(
        `
        SELECT *
        FROM purchase_item_lines
        WHERE purchase_id = ?
        ORDER BY line_no ASC
      `
      )
      .all(id)

    const paymentLines = db
      .prepare(
        `
        SELECT *
        FROM purchase_payment_lines
        WHERE purchase_id = ?
        ORDER BY line_no ASC
      `
      )
      .all(id)

    return {
      header,
      itemLines,
      paymentLines
    }
  },

  cancel(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const purchase = db
      .prepare(
        `
        SELECT id, purchase_no
        FROM purchase_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as PurchaseHeaderRow | undefined

    if (!purchase) {
      throw new Error('Purchase not found')
    }

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE purchase_headers
        SET
          deleted_at = ?,
          updated_at = ?,
          narration = TRIM(COALESCE(narration, '') || ?)
        WHERE id = ?
      `
      ).run(now, now, ` Cancelled on ${now}`, id)

      db.prepare(
        `
        DELETE FROM stock_ledger
        WHERE source_type = 'PURCHASE'
        AND source_id = ?
      `
      ).run(id)

      db.prepare(
        `
        DELETE FROM account_ledger
        WHERE source_type IN ('PURCHASE', 'PURCHASE_PAYMENT')
        AND source_id = ?
      `
      ).run(id)
    })

    transaction()

    return {
      success: true,
      purchaseNo: purchase.purchase_no
    }
  }
}
