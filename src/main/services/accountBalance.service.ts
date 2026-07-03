import { getDatabase } from '../database/connection'

type AccountOpeningRow = {
  id: string
  opening_gold_fine: number
  opening_silver_fine: number
  opening_cash: number
  opening_anamat: number
  opening_bank: number
}

type AccountBalanceReportAccountRow = {
  id: string
  account_name: string
  other_name: string
  mobile_number: string
  city: string
  opening_gold_fine: number
  opening_silver_fine: number
  opening_cash: number
  opening_anamat: number
  opening_bank: number
  group_name: string
}

type LedgerSumRow = {
  gold_fine_nave: number
  gold_fine_jama: number
  silver_fine_nave: number
  silver_fine_jama: number
  cash_nave: number
  cash_jama: number
  bank_nave: number
  bank_jama: number
  anamat_nave: number
  anamat_jama: number
}

export const accountBalanceService = {
  getAccountBalance(accountId: string) {
    const db = getDatabase()

    const account = db
      .prepare(
        `
        SELECT
          id,
          opening_gold_fine,
          opening_silver_fine,
          opening_cash,
          opening_anamat,
          opening_bank
        FROM accounts
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(accountId) as AccountOpeningRow | undefined

    if (!account) {
      throw new Error('Account not found')
    }

    const sums = db
      .prepare(
        `
        SELECT
          COALESCE(SUM(CASE WHEN metal_type = 'Gold' THEN fine_nave ELSE 0 END), 0) AS gold_fine_nave,
          COALESCE(SUM(CASE WHEN metal_type = 'Gold' THEN fine_jama ELSE 0 END), 0) AS gold_fine_jama,
          COALESCE(SUM(CASE WHEN metal_type = 'Silver' THEN fine_nave ELSE 0 END), 0) AS silver_fine_nave,
          COALESCE(SUM(CASE WHEN metal_type = 'Silver' THEN fine_jama ELSE 0 END), 0) AS silver_fine_jama,
          COALESCE(SUM(cash_nave), 0) AS cash_nave,
          COALESCE(SUM(cash_jama), 0) AS cash_jama,
          COALESCE(SUM(bank_nave), 0) AS bank_nave,
          COALESCE(SUM(bank_jama), 0) AS bank_jama,
          COALESCE(SUM(anamat_nave), 0) AS anamat_nave,
          COALESCE(SUM(anamat_jama), 0) AS anamat_jama
        FROM account_ledger
        WHERE account_id = ?
      `
      )
      .get(accountId) as LedgerSumRow

    return {
      goldFine:
        Number(account.opening_gold_fine ?? 0) +
        Number(sums.gold_fine_nave ?? 0) -
        Number(sums.gold_fine_jama ?? 0),
      silverFine:
        Number(account.opening_silver_fine ?? 0) +
        Number(sums.silver_fine_nave ?? 0) -
        Number(sums.silver_fine_jama ?? 0),
      cash:
        Number(account.opening_cash ?? 0) +
        Number(sums.cash_nave ?? 0) -
        Number(sums.cash_jama ?? 0),
      anamat:
        Number(account.opening_anamat ?? 0) +
        Number(sums.anamat_nave ?? 0) -
        Number(sums.anamat_jama ?? 0),
      bank:
        Number(account.opening_bank ?? 0) +
        Number(sums.bank_nave ?? 0) -
        Number(sums.bank_jama ?? 0)
    }
  },

  listAccountBalances() {
    const db = getDatabase()

    const accounts = db
      .prepare(
        `
        SELECT
          a.id,
          a.account_name,
          a.other_name,
          a.mobile_number,
          a.city,
          a.opening_gold_fine,
          a.opening_silver_fine,
          a.opening_cash,
          a.opening_anamat,
          a.opening_bank,
          ag.group_name
        FROM accounts a
        INNER JOIN account_groups ag ON ag.id = a.account_group_id
        WHERE a.deleted_at IS NULL
        ORDER BY a.account_name ASC
      `
      )
      .all() as AccountBalanceReportAccountRow[]

    return accounts.map((account) => {
      const balance = this.getAccountBalance(account.id)

      return {
        id: account.id,
        accountName: account.account_name,
        otherName: account.other_name,
        mobileNumber: account.mobile_number,
        city: account.city,
        groupName: account.group_name,
        openingGoldFine: Number(account.opening_gold_fine ?? 0),
        openingSilverFine: Number(account.opening_silver_fine ?? 0),
        openingCash: Number(account.opening_cash ?? 0),
        openingAnamat: Number(account.opening_anamat ?? 0),
        openingBank: Number(account.opening_bank ?? 0),
        goldFine: balance.goldFine,
        silverFine: balance.silverFine,
        cash: balance.cash,
        anamat: balance.anamat,
        bank: balance.bank
      }
    })
  }
}
