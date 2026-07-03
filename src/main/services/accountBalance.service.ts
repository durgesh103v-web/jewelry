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

type AccountLedgerRow = {
  id: string
  source_type: string
  source_id: string
  entry_date: string
  metal_type: string
  fine_jama: number
  fine_nave: number
  cash_jama: number
  cash_nave: number
  bank_jama: number
  bank_nave: number
  anamat_jama: number
  anamat_nave: number
  narration: string | null
  created_at: string
  sale_no: string | null
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
  },

  getAccountLedgerDetails(accountId: string) {
    const db = getDatabase()

    const account = db
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
        WHERE a.id = ?
        AND a.deleted_at IS NULL
      `
      )
      .get(accountId) as AccountBalanceReportAccountRow | undefined

    if (!account) {
      throw new Error('Account not found')
    }

    const ledgerRows = db
      .prepare(
        `
        SELECT
          al.id,
          al.source_type,
          al.source_id,
          al.entry_date,
          al.metal_type,
          al.fine_jama,
          al.fine_nave,
          al.cash_jama,
          al.cash_nave,
          al.bank_jama,
          al.bank_nave,
          al.anamat_jama,
          al.anamat_nave,
          al.narration,
          al.created_at,
          sh.sale_no
        FROM account_ledger al
        LEFT JOIN sale_headers sh ON sh.id = al.source_id
        WHERE al.account_id = ?
        ORDER BY al.entry_date ASC, al.created_at ASC
      `
      )
      .all(accountId) as AccountLedgerRow[]

    let runningGoldFine = Number(account.opening_gold_fine ?? 0)
    let runningSilverFine = Number(account.opening_silver_fine ?? 0)
    let runningCash = Number(account.opening_cash ?? 0)
    let runningBank = Number(account.opening_bank ?? 0)
    let runningAnamat = Number(account.opening_anamat ?? 0)

    const rows = ledgerRows.map((row, index) => {
      const fineJama = Number(row.fine_jama ?? 0)
      const fineNave = Number(row.fine_nave ?? 0)

      if (row.metal_type === 'Gold') {
        runningGoldFine = runningGoldFine + fineNave - fineJama
      }

      if (row.metal_type === 'Silver') {
        runningSilverFine = runningSilverFine + fineNave - fineJama
      }

      const cashJama = Number(row.cash_jama ?? 0)
      const cashNave = Number(row.cash_nave ?? 0)
      const bankJama = Number(row.bank_jama ?? 0)
      const bankNave = Number(row.bank_nave ?? 0)
      const anamatJama = Number(row.anamat_jama ?? 0)
      const anamatNave = Number(row.anamat_nave ?? 0)

      runningCash = runningCash + cashNave - cashJama
      runningBank = runningBank + bankNave - bankJama
      runningAnamat = runningAnamat + anamatNave - anamatJama

      return {
        id: row.id,
        srNo: index + 1,
        sourceType: row.source_type,
        sourceId: row.source_id,
        saleNo: row.sale_no ?? '',
        entryDate: row.entry_date,
        metalType: row.metal_type,
        fineJama,
        fineNave,
        cashJama,
        cashNave,
        bankJama,
        bankNave,
        anamatJama,
        anamatNave,
        narration: row.narration ?? '',
        runningGoldFine,
        runningSilverFine,
        runningCash,
        runningBank,
        runningAnamat
      }
    })

    return {
      account: {
        id: account.id,
        accountName: account.account_name,
        otherName: account.other_name,
        mobileNumber: account.mobile_number,
        city: account.city,
        groupName: account.group_name
      },
      openingBalance: {
        goldFine: Number(account.opening_gold_fine ?? 0),
        silverFine: Number(account.opening_silver_fine ?? 0),
        cash: Number(account.opening_cash ?? 0),
        anamat: Number(account.opening_anamat ?? 0),
        bank: Number(account.opening_bank ?? 0)
      },
      rows,
      closingBalance: {
        goldFine: runningGoldFine,
        silverFine: runningSilverFine,
        cash: runningCash,
        anamat: runningAnamat,
        bank: runningBank
      }
    }
  }
}
