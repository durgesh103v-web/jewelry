import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
  city: string
  active: boolean
}

type AccountLedgerDetailsRecord = {
  account: {
    id: string
    accountName: string
    otherName: string
    mobileNumber: string
    city: string
    groupName: string
  }
  openingBalance: {
    goldFine: number
    silverFine: number
    cash: number
    anamat: number
    bank: number
  }
  rows: Array<{
    id: string
    srNo: number
    sourceType: string
    sourceId: string
    saleNo: string
    entryDate: string
    metalType: string
    fineJama: number
    fineNave: number
    cashJama: number
    cashNave: number
    bankJama: number
    bankNave: number
    anamatJama: number
    anamatNave: number
    narration: string
    runningGoldFine: number
    runningSilverFine: number
    runningCash: number
    runningBank: number
    runningAnamat: number
  }>
  closingBalance: {
    goldFine: number
    silverFine: number
    cash: number
    anamat: number
    bank: number
  }
}

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function AccountwiseDetailsReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [report, setReport] = useState<AccountLedgerDetailsRecord | null>(null)
  const [searchText, setSearchText] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const filteredRows = useMemo(() => {
    if (!report) return []

    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return report.rows

    return report.rows.filter((row) => {
      return (
        row.sourceType.toLowerCase().includes(keyword) ||
        row.saleNo.toLowerCase().includes(keyword) ||
        row.metalType.toLowerCase().includes(keyword) ||
        row.narration.toLowerCase().includes(keyword) ||
        row.entryDate.toLowerCase().includes(keyword)
      )
    })
  }, [report, searchText])

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3000)
  }, [])

  const loadAccounts = useCallback(async (): Promise<void> => {
    try {
      setLoadingAccounts(true)
      const data = await window.api.accounts.list()
      setAccounts(data)

      const firstAccount = data.find((account) => account.active)

      if (firstAccount) {
        setSelectedAccountId(firstAccount.id)
      }
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoadingAccounts(false)
    }
  }, [showAlert])

  const loadReport = useCallback(
    async (accountId = selectedAccountId): Promise<void> => {
      if (!accountId) {
        showAlert('warning', 'Please select account.')
        return
      }

      try {
        setLoading(true)
        const data = await window.api.reports.accountLedgerDetails(accountId)
        setReport(data)
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      } finally {
        setLoading(false)
      }
    },
    [selectedAccountId, showAlert]
  )

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadAccounts()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadAccounts])

  useEffect(() => {
    if (!selectedAccountId) return undefined

    const loadTimer = window.setTimeout(() => {
      void loadReport(selectedAccountId)
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [selectedAccountId, loadReport])

  return (
    <div className="accountwise-details-screen">
      <div className="accountwise-details-window">
        <div className="form-title-bar">
          <span>Accountwise Details</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="accountwise-details-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="accountwise-details-toolbar">
            <div className="form-field">
              <label htmlFor="accountwise-account-select">Account</label>
              <select
                id="accountwise-account-select"
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                disabled={loadingAccounts}
              >
                <option value="">Select Account</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName} {account.mobileNumber ? `- ${account.mobileNumber}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="accountwise-ledger-search">Search Ledger</label>

              <input
                id="accountwise-ledger-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill no, narration, type, date"
              />

              {searchText && (
                <button
                  className="search-clear-btn"
                  type="button"
                  onClick={() => setSearchText('')}
                >
                  &times;
                </button>
              )}
            </div>

            <button
              className="btn-new"
              type="button"
              onClick={() => void loadReport()}
              disabled={loading || !selectedAccountId}
            >
              Refresh
            </button>
          </div>

          {report && (
            <>
              <div className="accountwise-account-card">
                <div>
                  <span>Account</span>
                  <strong>{report.account.accountName}</strong>
                </div>

                <div>
                  <span>Group</span>
                  <strong>{report.account.groupName}</strong>
                </div>

                <div>
                  <span>Mobile</span>
                  <strong>{report.account.mobileNumber || '-'}</strong>
                </div>

                <div>
                  <span>City</span>
                  <strong>{report.account.city || '-'}</strong>
                </div>
              </div>

              <div className="accountwise-balance-grid">
                <BalanceBox
                  title="Opening Balance"
                  goldFine={report.openingBalance.goldFine}
                  silverFine={report.openingBalance.silverFine}
                  cash={report.openingBalance.cash}
                  bank={report.openingBalance.bank}
                  anamat={report.openingBalance.anamat}
                />

                <BalanceBox
                  title="Closing Balance"
                  goldFine={report.closingBalance.goldFine}
                  silverFine={report.closingBalance.silverFine}
                  cash={report.closingBalance.cash}
                  bank={report.closingBalance.bank}
                  anamat={report.closingBalance.anamat}
                />
              </div>
            </>
          )}

          <div className="table-panel accountwise-details-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Date</th>
                  <th>Bill No</th>
                  <th>Type</th>
                  <th>Metal</th>
                  <th>Fine Jama</th>
                  <th>Fine Nave</th>
                  <th>Cash Jama</th>
                  <th>Cash Nave</th>
                  <th>Bank Jama</th>
                  <th>Bank Nave</th>
                  <th>Anamat Jama</th>
                  <th>Anamat Nave</th>
                  <th>Run Gold</th>
                  <th>Run Silver</th>
                  <th>Run Cash</th>
                  <th>Narration</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={17} className="empty-row">
                      Loading accountwise details...
                    </td>
                  </tr>
                ) : !report ? (
                  <tr>
                    <td colSpan={17} className="empty-row">
                      Select account to view ledger details.
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="empty-row">
                      {searchText ? 'No matching ledger entry found.' : 'No ledger entry found.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.srNo}</td>
                      <td>{formatDate(row.entryDate)}</td>
                      <td>{row.saleNo || '-'}</td>
                      <td>{row.sourceType}</td>
                      <td>{row.metalType || '-'}</td>
                      <td>{formatNumber(row.fineJama)}</td>
                      <td>{formatNumber(row.fineNave)}</td>
                      <td>{formatNumber(row.cashJama)}</td>
                      <td>{formatNumber(row.cashNave)}</td>
                      <td>{formatNumber(row.bankJama)}</td>
                      <td>{formatNumber(row.bankNave)}</td>
                      <td>{formatNumber(row.anamatJama)}</td>
                      <td>{formatNumber(row.anamatNave)}</td>
                      <td>{formatNumber(row.runningGoldFine)}</td>
                      <td>{formatNumber(row.runningSilverFine)}</td>
                      <td>{formatNumber(row.runningCash)}</td>
                      <td>{row.narration || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            This report shows ledger movement for selected account. Nave increases balance. Jama
            decreases balance.
          </div>
        </div>
      </div>
    </div>
  )
}

function BalanceBox({
  title,
  goldFine,
  silverFine,
  cash,
  bank,
  anamat
}: {
  title: string
  goldFine: number
  silverFine: number
  cash: number
  bank: number
  anamat: number
}): React.JSX.Element {
  return (
    <div className="accountwise-balance-box">
      <div className="accountwise-balance-title">{title}</div>

      <div>
        <span>Gold Fine</span>
        <strong>{formatNumber(goldFine)}</strong>
      </div>

      <div>
        <span>Silver Fine</span>
        <strong>{formatNumber(silverFine)}</strong>
      </div>

      <div>
        <span>Cash</span>
        <strong>{formatNumber(cash)}</strong>
      </div>

      <div>
        <span>Bank</span>
        <strong>{formatNumber(bank)}</strong>
      </div>

      <div>
        <span>Anamat</span>
        <strong>{formatNumber(anamat)}</strong>
      </div>
    </div>
  )
}

export default AccountwiseDetailsReportScreen
