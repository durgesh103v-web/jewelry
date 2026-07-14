import { getDatabase } from '../database/connection'

type DateFilter = {
  fromDate?: string
  toDate?: string
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function resolveDateRange(filter: DateFilter = {}): { fromDate: string; toDate: string } {
  const today = getTodayDate()
  return {
    fromDate: filter.fromDate || today,
    toDate: filter.toDate || today
  }
}

export const extendedReportService = {
  listBankTransactions(filter: DateFilter = {}) {
    const db = getDatabase()
    const { fromDate, toDate } = resolveDateRange(filter)

    return db
      .prepare(
        `
        SELECT
          al.id,
          al.entry_date AS entryDate,
          al.source_type AS sourceType,
          al.source_id AS sourceId,
          COALESCE(a.account_name, '') AS accountName,
          COALESCE(sh.sale_no, ph.purchase_no, cv.voucher_no, '') AS billNo,
          al.bank_jama AS bankJama,
          al.bank_nave AS bankNave,
          al.narration,
          al.created_at AS createdAt
        FROM account_ledger al
        LEFT JOIN accounts a ON a.id = al.account_id
        LEFT JOIN sale_headers sh ON sh.id = al.source_id AND al.source_type LIKE 'SALE%'
        LEFT JOIN purchase_headers ph ON ph.id = al.source_id AND al.source_type LIKE 'PURCHASE%'
        LEFT JOIN cash_vouchers cv ON cv.id = al.source_id AND al.source_type IN ('CASH_RECEIPT', 'CASH_PAYMENT')
        WHERE al.entry_date >= ?
          AND al.entry_date <= ?
          AND (al.bank_jama != 0 OR al.bank_nave != 0)
        ORDER BY al.entry_date ASC, al.created_at ASC
      `
      )
      .all(fromDate, toDate)
  },

  getDailySummary(filter: DateFilter = {}) {
    const db = getDatabase()
    const { fromDate, toDate } = resolveDateRange(filter)

    const sales = db
      .prepare(
        `
        SELECT
          COUNT(*) AS billCount,
          COALESCE(SUM(item_fine_total), 0) AS fineTotal,
          COALESCE(SUM(item_majuri_total), 0) AS majuriTotal,
          COALESCE(SUM(payment_cash_jama_total), 0) AS cashReceived,
          COALESCE(SUM(payment_bank_jama_total), 0) AS bankReceived
        FROM sale_headers
        WHERE deleted_at IS NULL
          AND sale_date >= ?
          AND sale_date <= ?
      `
      )
      .get(fromDate, toDate) as Record<string, number>

    const purchases = db
      .prepare(
        `
        SELECT
          COUNT(*) AS billCount,
          COALESCE(SUM(item_fine_total), 0) AS fineTotal,
          COALESCE(SUM(item_majuri_total), 0) AS majuriTotal,
          COALESCE(SUM(payment_cash_nave_total), 0) AS cashPaid,
          COALESCE(SUM(payment_bank_nave_total), 0) AS bankPaid
        FROM purchase_headers
        WHERE deleted_at IS NULL
          AND purchase_date >= ?
          AND purchase_date <= ?
      `
      )
      .get(fromDate, toDate) as Record<string, number>

    const cashVouchers = db
      .prepare(
        `
        SELECT
          COALESCE(SUM(CASE WHEN voucher_type = 'RECEIPT' THEN amount ELSE 0 END), 0) AS cashReceipt,
          COALESCE(SUM(CASE WHEN voucher_type = 'PAYMENT' THEN amount ELSE 0 END), 0) AS cashPayment
        FROM cash_vouchers
        WHERE deleted_at IS NULL
          AND voucher_date >= ?
          AND voucher_date <= ?
      `
      )
      .get(fromDate, toDate) as Record<string, number>

    return {
      fromDate,
      toDate,
      sales: {
        billCount: Number(sales.billCount || 0),
        fineTotal: Number(sales.fineTotal || 0),
        majuriTotal: Number(sales.majuriTotal || 0),
        cashReceived: Number(sales.cashReceived || 0),
        bankReceived: Number(sales.bankReceived || 0)
      },
      purchases: {
        billCount: Number(purchases.billCount || 0),
        fineTotal: Number(purchases.fineTotal || 0),
        majuriTotal: Number(purchases.majuriTotal || 0),
        cashPaid: Number(purchases.cashPaid || 0),
        bankPaid: Number(purchases.bankPaid || 0)
      },
      cashVouchers: {
        cashReceipt: Number(cashVouchers.cashReceipt || 0),
        cashPayment: Number(cashVouchers.cashPayment || 0)
      }
    }
  },

  listFineRojmel() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          a.id AS accountId,
          a.account_name AS accountName,
          COALESCE(ag.group_name, '') AS groupName,
          a.opening_gold_fine AS openingGoldFine,
          a.opening_silver_fine AS openingSilverFine,
          COALESCE(SUM(CASE WHEN al.metal_type = 'Gold' THEN al.fine_nave - al.fine_jama ELSE 0 END), 0) AS goldFineMovement,
          COALESCE(SUM(CASE WHEN al.metal_type = 'Silver' THEN al.fine_nave - al.fine_jama ELSE 0 END), 0) AS silverFineMovement,
          a.opening_gold_fine + COALESCE(SUM(CASE WHEN al.metal_type = 'Gold' THEN al.fine_nave - al.fine_jama ELSE 0 END), 0) AS closingGoldFine,
          a.opening_silver_fine + COALESCE(SUM(CASE WHEN al.metal_type = 'Silver' THEN al.fine_nave - al.fine_jama ELSE 0 END), 0) AS closingSilverFine
        FROM accounts a
        LEFT JOIN account_groups ag ON ag.id = a.account_group_id
        LEFT JOIN account_ledger al ON al.account_id = a.id
        WHERE a.deleted_at IS NULL
        GROUP BY a.id, a.account_name, ag.group_name, a.opening_gold_fine, a.opening_silver_fine
        HAVING closingGoldFine != 0 OR closingSilverFine != 0
        ORDER BY a.account_name ASC
      `
      )
      .all()
  },

  listDarRojmel() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          a.id AS accountId,
          a.account_name AS accountName,
          COALESCE(ag.group_name, '') AS groupName,
          a.opening_cash AS openingCash,
          COALESCE(SUM(al.cash_nave - al.cash_jama), 0) AS cashMovement,
          a.opening_cash + COALESCE(SUM(al.cash_nave - al.cash_jama), 0) AS closingCash
        FROM accounts a
        LEFT JOIN account_groups ag ON ag.id = a.account_group_id
        LEFT JOIN account_ledger al ON al.account_id = a.id
        WHERE a.deleted_at IS NULL
        GROUP BY a.id, a.account_name, ag.group_name, a.opening_cash
        HAVING closingCash != 0
        ORDER BY a.account_name ASC
      `
      )
      .all()
  },

  listAccountwiseSummary() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          a.id,
          a.account_name AS accountName,
          COALESCE(ag.group_name, '') AS groupName,
          COALESCE(a.city, '') AS city,
          a.opening_gold_fine + COALESCE(SUM(CASE WHEN al.metal_type = 'Gold' THEN al.fine_nave - al.fine_jama ELSE 0 END), 0) AS goldFine,
          a.opening_silver_fine + COALESCE(SUM(CASE WHEN al.metal_type = 'Silver' THEN al.fine_nave - al.fine_jama ELSE 0 END), 0) AS silverFine,
          a.opening_cash + COALESCE(SUM(al.cash_nave - al.cash_jama), 0) AS cash,
          a.opening_bank + COALESCE(SUM(al.bank_nave - al.bank_jama), 0) AS bank,
          a.opening_anamat + COALESCE(SUM(al.anamat_nave - al.anamat_jama), 0) AS anamat
        FROM accounts a
        LEFT JOIN account_groups ag ON ag.id = a.account_group_id
        LEFT JOIN account_ledger al ON al.account_id = a.id
        WHERE a.deleted_at IS NULL
        GROUP BY a.id, a.account_name, ag.group_name, a.city,
          a.opening_gold_fine, a.opening_silver_fine, a.opening_cash, a.opening_bank, a.opening_anamat
        ORDER BY a.account_name ASC
      `
      )
      .all()
  },

  listItemwiseSalePurchase(filter: DateFilter = {}) {
    const db = getDatabase()
    const { fromDate, toDate } = resolveDateRange(filter)

    return db
      .prepare(
        `
        SELECT
          i.id AS itemId,
          i.item_name AS itemName,
          i.metal_type AS metalType,
          'SALE' AS transactionType,
          sh.sale_no AS billNo,
          sh.sale_date AS billDate,
          sil.pcs,
          sil.net_weight AS netWeight,
          sil.fine,
          sil.majuri
        FROM sale_item_lines sil
        INNER JOIN sale_headers sh ON sh.id = sil.sale_id
        INNER JOIN items i ON i.id = sil.item_id
        WHERE sh.deleted_at IS NULL
          AND sh.sale_date >= ?
          AND sh.sale_date <= ?

        UNION ALL

        SELECT
          i.id AS itemId,
          i.item_name AS itemName,
          i.metal_type AS metalType,
          'PURCHASE' AS transactionType,
          ph.purchase_no AS billNo,
          ph.purchase_date AS billDate,
          pil.pcs,
          pil.net_weight AS netWeight,
          pil.fine,
          pil.majuri
        FROM purchase_item_lines pil
        INNER JOIN purchase_headers ph ON ph.id = pil.purchase_id
        INNER JOIN items i ON i.id = pil.item_id
        WHERE ph.deleted_at IS NULL
          AND ph.purchase_date >= ?
          AND ph.purchase_date <= ?

        ORDER BY billDate DESC, billNo DESC
      `
      )
      .all(fromDate, toDate, fromDate, toDate)
  },

  listItemSalePurchaseCityWise(filter: DateFilter = {}) {
    const db = getDatabase()
    const { fromDate, toDate } = resolveDateRange(filter)

    return db
      .prepare(
        `
        SELECT
          COALESCE(a.city, 'Unknown') AS city,
          i.item_name AS itemName,
          i.metal_type AS metalType,
          COALESCE(SUM(CASE WHEN tx.transaction_type = 'SALE' THEN tx.pcs ELSE 0 END), 0) AS salePcs,
          COALESCE(SUM(CASE WHEN tx.transaction_type = 'SALE' THEN tx.fine ELSE 0 END), 0) AS saleFine,
          COALESCE(SUM(CASE WHEN tx.transaction_type = 'PURCHASE' THEN tx.pcs ELSE 0 END), 0) AS purchasePcs,
          COALESCE(SUM(CASE WHEN tx.transaction_type = 'PURCHASE' THEN tx.fine ELSE 0 END), 0) AS purchaseFine
        FROM (
          SELECT 'SALE' AS transaction_type, sh.account_id, sil.item_id, sil.pcs, sil.fine
          FROM sale_item_lines sil
          INNER JOIN sale_headers sh ON sh.id = sil.sale_id
          WHERE sh.deleted_at IS NULL AND sh.sale_date >= ? AND sh.sale_date <= ?
          UNION ALL
          SELECT 'PURCHASE', ph.account_id, pil.item_id, pil.pcs, pil.fine
          FROM purchase_item_lines pil
          INNER JOIN purchase_headers ph ON ph.id = pil.purchase_id
          WHERE ph.deleted_at IS NULL AND ph.purchase_date >= ? AND ph.purchase_date <= ?
        ) tx
        INNER JOIN items i ON i.id = tx.item_id
        LEFT JOIN accounts a ON a.id = tx.account_id
        GROUP BY COALESCE(a.city, 'Unknown'), i.item_name, i.metal_type
        ORDER BY city ASC, itemName ASC
      `
      )
      .all(fromDate, toDate, fromDate, toDate)
  },

  listFineMargin(filter: DateFilter = {}) {
    const db = getDatabase()
    const { fromDate, toDate } = resolveDateRange(filter)

    return db
      .prepare(
        `
        SELECT
          i.id AS itemId,
          i.item_name AS itemName,
          i.metal_type AS metalType,
          COALESCE(sale.saleFine, 0) AS saleFine,
          COALESCE(sale.saleMajuri, 0) AS saleMajuri,
          COALESCE(purchase.purchaseFine, 0) AS purchaseFine,
          COALESCE(purchase.purchaseMajuri, 0) AS purchaseMajuri,
          COALESCE(sale.saleFine, 0) - COALESCE(purchase.purchaseFine, 0) AS fineMargin,
          COALESCE(sale.saleMajuri, 0) - COALESCE(purchase.purchaseMajuri, 0) AS majuriMargin
        FROM items i
        LEFT JOIN (
          SELECT sil.item_id, SUM(sil.fine) AS saleFine, SUM(sil.majuri) AS saleMajuri
          FROM sale_item_lines sil
          INNER JOIN sale_headers sh ON sh.id = sil.sale_id
          WHERE sh.deleted_at IS NULL AND sh.sale_date >= ? AND sh.sale_date <= ?
          GROUP BY sil.item_id
        ) sale ON sale.item_id = i.id
        LEFT JOIN (
          SELECT pil.item_id, SUM(pil.fine) AS purchaseFine, SUM(pil.majuri) AS purchaseMajuri
          FROM purchase_item_lines pil
          INNER JOIN purchase_headers ph ON ph.id = pil.purchase_id
          WHERE ph.deleted_at IS NULL AND ph.purchase_date >= ? AND ph.purchase_date <= ?
          GROUP BY pil.item_id
        ) purchase ON purchase.item_id = i.id
        WHERE i.deleted_at IS NULL
          AND (COALESCE(sale.saleFine, 0) != 0 OR COALESCE(purchase.purchaseFine, 0) != 0)
        ORDER BY i.item_name ASC
      `
      )
      .all(fromDate, toDate, fromDate, toDate)
  },

  listPaymentReceipt(filter: DateFilter = {}) {
    const db = getDatabase()
    const { fromDate, toDate } = resolveDateRange(filter)

    return db
      .prepare(
        `
        SELECT
          cv.id,
          cv.voucher_type AS voucherType,
          cv.voucher_no AS voucherNo,
          cv.voucher_date AS voucherDate,
          a.account_name AS accountName,
          cv.amount,
          cv.narration,
          cv.created_at AS createdAt
        FROM cash_vouchers cv
        INNER JOIN accounts a ON a.id = cv.account_id
        WHERE cv.deleted_at IS NULL
          AND cv.voucher_date >= ?
          AND cv.voucher_date <= ?
        ORDER BY cv.voucher_date DESC, cv.created_at DESC
      `
      )
      .all(fromDate, toDate)
  },

  listGstSaleRegister(filter: DateFilter = {}) {
    const db = getDatabase()
    const { fromDate, toDate } = resolveDateRange(filter)

    return db
      .prepare(
        `
        SELECT
          sh.id,
          sh.sale_no AS saleNo,
          sh.sale_date AS saleDate,
          a.account_name AS accountName,
          sh.metal_type AS metalType,
          sh.item_fine_total AS itemFineTotal,
          sh.item_majuri_total AS itemMajuriTotal,
          sh.taxable_amount AS taxableAmount,
          sh.cgst_amount AS cgstAmount,
          sh.sgst_amount AS sgstAmount,
          sh.igst_amount AS igstAmount,
          sh.created_at AS createdAt
        FROM sale_headers sh
        INNER JOIN accounts a ON a.id = sh.account_id
        WHERE sh.deleted_at IS NULL
          AND sh.bill_type = 'RETAIL_GST'
          AND sh.sale_date >= ?
          AND sh.sale_date <= ?
        ORDER BY sh.sale_date DESC, sh.created_at DESC
      `
      )
      .all(fromDate, toDate)
  }
}
