import dayjs from 'dayjs'
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
  bill_no: string | null
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

type LastLedgerEntryRow = {
  account_id: string
  last_entry_date: string
}

type AccountBalanceListRecord = {
  id: string
  accountName: string
  otherName: string
  mobileNumber: string
  city: string
  groupName: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  goldFine: number
  silverFine: number
  cash: number
  anamat: number
  bank: number
}

type OutstandingRecord = AccountBalanceListRecord & {
  status: 'RECEIVABLE' | 'PAYABLE'
  sortValue: number
  lastTransactionDate: string | null
  daysSinceLastTransaction: number | null
}

const OUTSTANDING_EPSILON = 0.0005

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

    // Single grouped aggregate over the whole ledger instead of one query per
    // account (previously an N+1: getAccountBalance() was called in a loop).
    // Turns N+1 round-trips into 2 for the entire balances list.
    const ledgerSums = db
      .prepare(
        `
        SELECT
          account_id,
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
        GROUP BY account_id
      `
      )
      .all() as (LedgerSumRow & { account_id: string })[]

    const sumsByAccountId = new Map(ledgerSums.map((row) => [row.account_id, row]))

    return accounts.map((account) => {
      const sums = sumsByAccountId.get(account.id)

      const openingGoldFine = Number(account.opening_gold_fine ?? 0)
      const openingSilverFine = Number(account.opening_silver_fine ?? 0)
      const openingCash = Number(account.opening_cash ?? 0)
      const openingAnamat = Number(account.opening_anamat ?? 0)
      const openingBank = Number(account.opening_bank ?? 0)

      return {
        id: account.id,
        accountName: account.account_name,
        otherName: account.other_name,
        mobileNumber: account.mobile_number,
        city: account.city,
        groupName: account.group_name,
        openingGoldFine,
        openingSilverFine,
        openingCash,
        openingAnamat,
        openingBank,
        goldFine:
          openingGoldFine +
          Number(sums?.gold_fine_nave ?? 0) -
          Number(sums?.gold_fine_jama ?? 0),
        silverFine:
          openingSilverFine +
          Number(sums?.silver_fine_nave ?? 0) -
          Number(sums?.silver_fine_jama ?? 0),
        cash: openingCash + Number(sums?.cash_nave ?? 0) - Number(sums?.cash_jama ?? 0),
        anamat: openingAnamat + Number(sums?.anamat_nave ?? 0) - Number(sums?.anamat_jama ?? 0),
        bank: openingBank + Number(sums?.bank_nave ?? 0) - Number(sums?.bank_jama ?? 0)
      }
    })
  },

  /**
   * Outstanding report — built on top of listAccountBalances(). Keeps only accounts with a
   * non-zero balance in any of gold fine / silver fine / cash / anamat / bank, and splits them
   * into Receivable (party owes the firm) vs Payable (firm owes the party).
   *
   * Sign convention (see getAccountBalance above): balance = opening + nave - jama.
   * Sale/Purchase-payment-received entries post to "nave" (debit) which raises the balance,
   * so a positive balance means the party owes the firm (Receivable). Purchase/Sale-payment-made
   * entries post to "jama" (credit) which lowers the balance, so a negative balance means the
   * firm owes the party (Payable).
   *
   * Since gold/silver fine (weight) and cash/anamat/bank (currency) are different units, an
   * account is classified by whichever of its five balance fields has the largest magnitude
   * (its "dominant" balance), and rows are sorted by the sum of absolute values across all five
   * fields — a simple magnitude proxy, not a true cross-unit total.
   */
  getOutstandingBalances() {
    const db = getDatabase()

    const balances = this.listAccountBalances() as AccountBalanceListRecord[]

    const lastEntryRows = db
      .prepare(
        `
        SELECT
          account_id,
          MAX(entry_date) AS last_entry_date
        FROM account_ledger
        GROUP BY account_id
      `
      )
      .all() as LastLedgerEntryRow[]

    const lastEntryByAccountId = new Map(
      lastEntryRows.map((row) => [row.account_id, row.last_entry_date])
    )

    const today = dayjs()

    const outstanding = balances.reduce<OutstandingRecord[]>((list, account) => {
      const fields = [account.goldFine, account.silverFine, account.cash, account.anamat, account.bank]
      const hasOutstanding = fields.some((value) => Math.abs(value) > OUTSTANDING_EPSILON)

      if (!hasOutstanding) {
        return list
      }

      const dominant = fields.reduce(
        (max, value) => (Math.abs(value) > Math.abs(max) ? value : max),
        0
      )
      const sortValue = fields.reduce((sum, value) => sum + Math.abs(value), 0)
      const lastTransactionDate = lastEntryByAccountId.get(account.id) ?? null
      const daysSinceLastTransaction = lastTransactionDate
        ? Math.max(0, today.diff(dayjs(lastTransactionDate), 'day'))
        : null

      list.push({
        ...account,
        status: dominant >= 0 ? 'RECEIVABLE' : 'PAYABLE',
        sortValue,
        lastTransactionDate,
        daysSinceLastTransaction
      })

      return list
    }, [])

    outstanding.sort((a, b) => b.sortValue - a.sortValue)

    const receivable = outstanding.filter((account) => account.status === 'RECEIVABLE')
    const payable = outstanding.filter((account) => account.status === 'PAYABLE')

    const sumTotals = (list: OutstandingRecord[]) =>
      list.reduce(
        (total, account) => {
          total.goldFine += account.goldFine
          total.silverFine += account.silverFine
          total.cash += account.cash
          total.anamat += account.anamat
          total.bank += account.bank
          return total
        },
        { goldFine: 0, silverFine: 0, cash: 0, anamat: 0, bank: 0 }
      )

    return {
      receivable,
      payable,
      receivableTotals: sumTotals(receivable),
      payableTotals: sumTotals(payable)
    }
  },

  getAccountLedgerDetails(
    accountId: string,
    filter?: { fromDate?: string; toDate?: string }
  ) {
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

    const ledgerQueryBase = `
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
          COALESCE(sh.sale_no, ph.purchase_no, srh.return_no, prh.return_no, cv.voucher_no, '') AS bill_no
        FROM account_ledger al
        LEFT JOIN sale_headers sh ON sh.id = al.source_id AND al.source_type IN ('SALE', 'SALE_PAYMENT')
        LEFT JOIN purchase_headers ph ON ph.id = al.source_id AND al.source_type IN ('PURCHASE', 'PURCHASE_PAYMENT')
        LEFT JOIN sale_return_headers srh ON srh.id = al.source_id AND al.source_type = 'SALE_RETURN'
        LEFT JOIN purchase_return_headers prh ON prh.id = al.source_id AND al.source_type = 'PURCHASE_RETURN'
        LEFT JOIN cash_vouchers cv ON cv.id = al.source_id AND al.source_type IN ('CASH_RECEIPT', 'CASH_PAYMENT')
      `

    const fromDate = filter?.fromDate || ''
    const toDate = filter?.toDate || ''

    let runningGoldFine = Number(account.opening_gold_fine ?? 0)
    let runningSilverFine = Number(account.opening_silver_fine ?? 0)
    let runningCash = Number(account.opening_cash ?? 0)
    let runningBank = Number(account.opening_bank ?? 0)
    let runningAnamat = Number(account.opening_anamat ?? 0)

    if (fromDate) {
      const priorRows = db
        .prepare(`${ledgerQueryBase} WHERE al.account_id = ? AND al.entry_date < ?`)
        .all(accountId, fromDate) as AccountLedgerRow[]

      for (const row of priorRows) {
        const fineJama = Number(row.fine_jama ?? 0)
        const fineNave = Number(row.fine_nave ?? 0)

        if (row.metal_type === 'Gold') {
          runningGoldFine = runningGoldFine + fineNave - fineJama
        }

        if (row.metal_type === 'Silver') {
          runningSilverFine = runningSilverFine + fineNave - fineJama
        }

        runningCash = runningCash + Number(row.cash_nave ?? 0) - Number(row.cash_jama ?? 0)
        runningBank = runningBank + Number(row.bank_nave ?? 0) - Number(row.bank_jama ?? 0)
        runningAnamat = runningAnamat + Number(row.anamat_nave ?? 0) - Number(row.anamat_jama ?? 0)
      }
    }

    const periodOpeningBalance = {
      goldFine: runningGoldFine,
      silverFine: runningSilverFine,
      cash: runningCash,
      anamat: runningAnamat,
      bank: runningBank
    }

    const conditions = ['al.account_id = ?']
    const params: string[] = [accountId]

    if (fromDate) {
      conditions.push('al.entry_date >= ?')
      params.push(fromDate)
    }

    if (toDate) {
      conditions.push('al.entry_date <= ?')
      params.push(toDate)
    }

    const ledgerRows = db
      .prepare(
        `${ledgerQueryBase} WHERE ${conditions.join(' AND ')} ORDER BY al.entry_date ASC, al.created_at ASC`
      )
      .all(...params) as AccountLedgerRow[]

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
        saleNo: row.bill_no ?? '',
        billNo: row.bill_no ?? '',
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
      periodOpeningBalance,
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
