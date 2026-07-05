import { getDatabase } from '../database/connection'

export const salePurchaseReportService = {
  listAccountWiseSalePurchase() {
    const db = getDatabase()

    return db
      .prepare(
        `
        SELECT
          sh.id AS id,
          'SALE' AS transactionType,
          sh.sale_no AS billNo,
          sh.sale_date AS billDate,
          sh.account_id AS accountId,
          a.account_name AS accountName,
          COALESCE(a.mobile_number, '') AS mobileNumber,
          COALESCE(a.city, '') AS city,
          COALESCE(ag.group_name, '') AS groupName,
          sh.metal_type AS metalType,

          0 AS fineJama,
          sh.item_fine_total AS fineNave,

          sh.payment_fine_jama_total AS paymentFineJama,
          0 AS paymentFineNave,

          0 AS cashJama,
          sh.item_majuri_total AS cashNave,

          sh.payment_cash_jama_total AS paymentCashJama,
          0 AS paymentCashNave,

          sh.payment_bank_jama_total AS bankJama,
          0 AS bankNave,

          sh.payment_anamat_jama_total AS anamatJama,
          0 AS anamatNave,

          sh.closing_gold_fine AS closingGoldFine,
          sh.closing_silver_fine AS closingSilverFine,
          sh.closing_cash AS closingCash,
          sh.created_at AS createdAt
        FROM sale_headers sh
        INNER JOIN accounts a ON a.id = sh.account_id
        LEFT JOIN account_groups ag ON ag.id = a.account_group_id
        WHERE sh.deleted_at IS NULL

        UNION ALL

        SELECT
          ph.id AS id,
          'PURCHASE' AS transactionType,
          ph.purchase_no AS billNo,
          ph.purchase_date AS billDate,
          ph.account_id AS accountId,
          a.account_name AS accountName,
          COALESCE(a.mobile_number, '') AS mobileNumber,
          COALESCE(a.city, '') AS city,
          COALESCE(ag.group_name, '') AS groupName,
          ph.metal_type AS metalType,

          ph.item_fine_total AS fineJama,
          0 AS fineNave,

          0 AS paymentFineJama,
          ph.payment_fine_nave_total AS paymentFineNave,

          ph.item_majuri_total AS cashJama,
          0 AS cashNave,

          0 AS paymentCashJama,
          ph.payment_cash_nave_total AS paymentCashNave,

          0 AS bankJama,
          ph.payment_bank_nave_total AS bankNave,

          0 AS anamatJama,
          ph.payment_anamat_nave_total AS anamatNave,

          ph.closing_gold_fine AS closingGoldFine,
          ph.closing_silver_fine AS closingSilverFine,
          ph.closing_cash AS closingCash,
          ph.created_at AS createdAt
        FROM purchase_headers ph
        INNER JOIN accounts a ON a.id = ph.account_id
        LEFT JOIN account_groups ag ON ag.id = a.account_group_id
        WHERE ph.deleted_at IS NULL

        ORDER BY billDate DESC, createdAt DESC
      `
      )
      .all()
  }
}
