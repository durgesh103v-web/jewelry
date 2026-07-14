import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { accountBalanceService } from './accountBalance.service'
import {
  calculateFineFromHishob,
  calculateHishob,
  calculateSaleItemTotals,
  roundNumber,
  type LabourRateType
} from './jewelleryFormula.service'
import { saleNumberService } from './saleNumber.service'

const saleItemLineSchema = z.object({
  lineType: z.string().trim().optional().default('NAVE'),
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

const salePaymentLineSchema = z.object({
  type: z.string().trim().optional().default(''),
  jamaNave: z.enum(['JAMA', 'NAVE']).optional().default('JAMA'),
  details: z.string().trim().optional().default(''),
  pcs: z.coerce.number().default(0),
  weight: z.coerce.number().default(0),
  tunch: z.coerce.number().default(0),
  wastage: z.coerce.number().default(0),
  fine: z.coerce.number().default(0),
  rate: z.coerce.number().default(0),
  fineAmount: z.coerce.number().default(0),
  anamat: z.coerce.number().default(0),
  cash: z.coerce.number().default(0),
  bank: z.coerce.number().default(0),
  accountId: z.string().trim().optional().default('')
})

const saleSchema = z.object({
  saleDate: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  phone: z.string().trim().optional().default(''),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']).default('Silver'),
  haste: z.string().trim().optional().default(''),
  dpNo: z.string().trim().optional().default(''),
  narration: z.string().trim().optional().default(''),
  reminderDate: z.string().trim().optional().default(''),
  itemLines: z.array(saleItemLineSchema).min(1, 'At least one item is required'),
  paymentLines: z.array(salePaymentLineSchema).optional().default([])
})

type SalePayload = z.infer<typeof saleSchema>

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

export const saleService = {
  getNextSaleNo() {
    return saleNumberService.getNextSaleNo()
  },

  getAccountBalance(accountId: string) {
    return accountBalanceService.getAccountBalance(accountId)
  },

  create(payload: SalePayload) {
    const data = saleSchema.parse(payload)
    const db = getDatabase()

    const saleId = uuidv4()
    const saleNo = saleNumberService.getNextSaleNo()
    const saleDate = data.saleDate || dayjs().format('YYYY-MM-DD')
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
        lineType: line.lineType || 'NAVE',
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
      const hishob = calculateHishob(line.tunch, line.wastage)
      const calculatedFine =
        line.fine > 0 ? line.fine : calculateFineFromHishob(line.weight, hishob)

      return {
        id: uuidv4(),
        lineNo: index + 1,
        type: line.type || '',
        jamaNave: line.jamaNave || 'JAMA',
        details: line.details || '',
        pcs: line.pcs,
        weight: line.weight,
        tunch: line.tunch,
        wastage: line.wastage,
        hishob,
        fine: calculatedFine,
        rate: line.rate,
        fineAmount: line.fineAmount,
        anamat: line.anamat,
        cash: line.cash,
        bank: line.bank,
        accountId: line.accountId || ''
      }
    })

    // All totals are rounded consistently with purchase/return services so the
    // header, account_ledger, and closing balances never store floating-point
    // noise: fine to 3 decimals, currency (majuri/cash/bank/anamat) to whole units.
    //
    // Every sale payment line is a JAMA (amount received) in this app - the Sale
    // screen only ever produces JAMA lines. All lines are therefore summed with
    // no jama/nave filtering, which guarantees no entered payment is silently
    // dropped from the totals or the account ledger.
    const itemFineTotal = roundNumber(
      preparedItemLines.reduce((total, line) => total + line.fine, 0)
    )
    const itemMajuriTotal = roundNumber(
      preparedItemLines.reduce((total, line) => total + line.majuri, 0),
      0
    )
    const paymentFineJamaTotal = roundNumber(
      preparedPaymentLines.reduce((total, line) => total + line.fine, 0)
    )
    const paymentCashJamaTotal = roundNumber(
      preparedPaymentLines.reduce((total, line) => total + line.cash, 0),
      0
    )
    const paymentBankJamaTotal = roundNumber(
      preparedPaymentLines.reduce((total, line) => total + line.bank, 0),
      0
    )
    const paymentAnamatJamaTotal = roundNumber(
      preparedPaymentLines.reduce((total, line) => total + line.anamat, 0),
      0
    )

    const closingGoldFine =
      data.metalType === 'Gold'
        ? roundNumber(oldBalance.goldFine + itemFineTotal - paymentFineJamaTotal)
        : oldBalance.goldFine
    const closingSilverFine =
      data.metalType === 'Silver'
        ? roundNumber(oldBalance.silverFine + itemFineTotal - paymentFineJamaTotal)
        : oldBalance.silverFine
    const closingCash = roundNumber(oldBalance.cash + itemMajuriTotal - paymentCashJamaTotal, 0)
    const closingBank = roundNumber(oldBalance.bank - paymentBankJamaTotal, 0)
    const closingAnamat = roundNumber(oldBalance.anamat - paymentAnamatJamaTotal, 0)

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO sale_headers (
          id,
          sale_no,
          sale_date,
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
          payment_fine_jama_total,
          payment_cash_jama_total,
          payment_bank_jama_total,
          payment_anamat_jama_total,
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
        saleId,
        saleNo,
        saleDate,
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
        paymentFineJamaTotal,
        paymentCashJamaTotal,
        paymentBankJamaTotal,
        paymentAnamatJamaTotal,
        closingGoldFine,
        closingSilverFine,
        closingCash,
        closingAnamat,
        closingBank,
        now,
        now
      )

      // Prepared statements are hoisted out of the loop so each line reuses one
      // compiled statement instead of recompiling the SQL on every iteration.
      const insertSaleItemLine = db.prepare(
        `
          INSERT INTO sale_item_lines (
            id,
            sale_id,
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
      const insertSaleStockLedger = db.prepare(
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
        insertSaleItemLine.run(
          line.id,
          saleId,
          line.lineNo,
          line.lineType,
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

        insertSaleStockLedger.run(
          uuidv4(),
          'SALE',
          saleId,
          saleDate,
          line.itemId,
          emptyToNull(line.stampId),
          emptyToNull(line.designId),
          data.metalType,
          -line.pcs,
          -line.grossWeight,
          -line.netWeight,
          -line.fine,
          `Sale ${saleNo}`,
          now
        )
      }

      const insertSalePaymentLine = db.prepare(
        `
          INSERT INTO sale_payment_lines (
            id,
            sale_id,
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
        insertSalePaymentLine.run(
          line.id,
          saleId,
          line.lineNo,
          line.type,
          line.jamaNave,
          line.details,
          line.pcs,
          line.weight,
          line.tunch,
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
          fine_nave,
          cash_nave,
          narration,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        uuidv4(),
        'SALE',
        saleId,
        saleDate,
        data.accountId,
        data.metalType,
        itemFineTotal,
        itemMajuriTotal,
        `Sale ${saleNo}`,
        now
      )

      if (
        paymentFineJamaTotal > 0 ||
        paymentCashJamaTotal > 0 ||
        paymentBankJamaTotal > 0 ||
        paymentAnamatJamaTotal > 0
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
            fine_jama,
            cash_jama,
            bank_jama,
            anamat_jama,
            narration,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          uuidv4(),
          'SALE_PAYMENT',
          saleId,
          saleDate,
          data.accountId,
          data.metalType,
          paymentFineJamaTotal,
          paymentCashJamaTotal,
          paymentBankJamaTotal,
          paymentAnamatJamaTotal,
          `Sale payment ${saleNo}`,
          now
        )
      }
    })

    transaction()

    return this.getById(saleId)
  },

  // Void/cancel a sale bill. This is the single reversal path used both by the
  // quick "Cancel" action on Sale Register and by the restricted "Delete Sale
  // Bills" utility screen (the latter always passes a mandatory reason).
  //
  // Reversal approach (matches the existing convention already used here and
  // in saleReturnService.delete()): sale_headers.deleted_at is the canonical
  // "excluded from active data" flag - every list()/getById()/report query in
  // this codebase already filters WHERE deleted_at IS NULL, so soft-deleting
  // the header automatically drops it out of Sale Register, GST reports etc.
  // The stock_ledger and account_ledger rows created by create() (source_type
  // 'SALE' / 'SALE_PAYMENT', source_id = sale id) are hard-deleted so Stock
  // Report and Account Balance/Outstanding totals net back to exactly what
  // they were before the sale existed - equivalent to posting an opposite
  // compensating entry, but without leaving stray offsetting rows behind.
  cancel(id: string, reason?: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const trimmedReason = (reason ?? '').trim()

    const sale = db
      .prepare(
        `
        SELECT id, sale_no
        FROM sale_headers
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as { id: string; sale_no: string } | undefined

    if (!sale) {
      throw new Error('Sale not found')
    }

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE sale_headers
        SET
          deleted_at = ?,
          voided_at = ?,
          void_reason = ?,
          updated_at = ?,
          narration = TRIM(COALESCE(narration, '') || ?)
        WHERE id = ?
      `
      ).run(
        now,
        now,
        trimmedReason,
        now,
        trimmedReason ? ` Voided on ${now}: ${trimmedReason}` : ` Cancelled on ${now}`,
        id
      )

      db.prepare(
        `
        DELETE FROM stock_ledger
        WHERE source_type = 'SALE'
        AND source_id = ?
      `
      ).run(id)

      db.prepare(
        `
        DELETE FROM account_ledger
        WHERE source_type IN ('SALE', 'SALE_PAYMENT')
        AND source_id = ?
      `
      ).run(id)
    })

    transaction()

    return {
      success: true,
      saleNo: sale.sale_no
    }
  },

  // Used by the Delete Sale Bills utility screen, which needs to show both
  // active and already-voided bills (for audit/history) - unlike list(),
  // which only returns active bills for Sale Register.
  listAllForDelete() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          sh.id,
          sh.sale_no,
          sh.sale_date,
          sh.account_id AS accountId,
          sh.metal_type,
          sh.item_fine_total,
          sh.item_majuri_total,
          sh.closing_gold_fine,
          sh.closing_silver_fine,
          sh.closing_cash,
          sh.narration,
          sh.voided_at,
          sh.void_reason,
          CASE WHEN sh.deleted_at IS NULL THEN 'ACTIVE' ELSE 'VOIDED' END AS status,
          a.account_name,
          a.mobile_number
        FROM sale_headers sh
        INNER JOIN accounts a ON a.id = sh.account_id
        ORDER BY sh.sale_date DESC, sh.created_at DESC
      `
      )
      .all()
  },

  list() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          sh.id,
          sh.sale_no,
          sh.sale_date,
          sh.account_id AS accountId,
          sh.metal_type,
          sh.item_fine_total,
          sh.item_majuri_total,
          sh.payment_fine_jama_total,
          sh.payment_cash_jama_total,
          sh.closing_gold_fine,
          sh.closing_silver_fine,
          sh.closing_cash,
          a.account_name,
          a.mobile_number
        FROM sale_headers sh
        INNER JOIN accounts a ON a.id = sh.account_id
        WHERE sh.deleted_at IS NULL
        ORDER BY sh.sale_date DESC, sh.created_at DESC
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
          sh.*,
          a.account_name,
          a.mobile_number
        FROM sale_headers sh
        INNER JOIN accounts a ON a.id = sh.account_id
        WHERE sh.id = ?
        AND sh.deleted_at IS NULL
      `
      )
      .get(id)

    if (!header) {
      throw new Error('Sale not found')
    }

    const itemLines = db
      .prepare(
        `
        SELECT *
        FROM sale_item_lines
        WHERE sale_id = ?
        ORDER BY line_no ASC
      `
      )
      .all(id)

    const paymentLines = db
      .prepare(
        `
        SELECT *
        FROM sale_payment_lines
        WHERE sale_id = ?
        ORDER BY line_no ASC
      `
      )
      .all(id)

    return {
      header,
      itemLines,
      paymentLines
    }
  }
}
