import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type AccountBalanceReportRecord = {
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

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function AccountBalanceReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [records, setRecords] = useState<AccountBalanceReportRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return records

    return records.filter((record) => {
      return (
        record.accountName.toLowerCase().includes(keyword) ||
        record.otherName.toLowerCase().includes(keyword) ||
        record.mobileNumber.toLowerCase().includes(keyword) ||
        record.city.toLowerCase().includes(keyword) ||
        record.groupName.toLowerCase().includes(keyword)
      )
    })
  }, [records, searchText])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.goldFine += record.goldFine
        total.silverFine += record.silverFine
        total.cash += record.cash
        total.anamat += record.anamat
        total.bank += record.bank
        return total
      },
      {
        goldFine: 0,
        silverFine: 0,
        cash: 0,
        anamat: 0,
        bank: 0
      }
    )
  }, [filteredRecords])

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

  const loadReport = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.reports.accountBalance()
      setRecords(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadReport()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadReport])

  return (
    <div className="account-balance-report-screen">
      <div className="account-balance-report-window">
        <div className="form-title-bar">
          <span>Account Balance</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-balance-report-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="account-balance-toolbar">
            <div className="list-search">
              <label htmlFor="account-balance-search">Search</label>

              <input
                id="account-balance-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search account, mobile, city, group"
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
              disabled={loading}
            >
              Refresh
            </button>

            <div className="record-summary">
              Accounts: <strong>{records.length}</strong> | Showing:{' '}
              <strong>{filteredRecords.length}</strong>
            </div>
          </div>

          <div className="account-balance-summary">
            <div>
              <span>Gold Fine</span>
              <strong>{formatNumber(totals.goldFine)}</strong>
            </div>

            <div>
              <span>Silver Fine</span>
              <strong>{formatNumber(totals.silverFine)}</strong>
            </div>

            <div>
              <span>Cash</span>
              <strong>{formatNumber(totals.cash)}</strong>
            </div>

            <div>
              <span>Anamat</span>
              <strong>{formatNumber(totals.anamat)}</strong>
            </div>

            <div>
              <span>Bank</span>
              <strong>{formatNumber(totals.bank)}</strong>
            </div>
          </div>

          <div className="table-panel account-balance-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Account</th>
                  <th>Other Name</th>
                  <th>Group</th>
                  <th>Mobile</th>
                  <th>City</th>
                  <th>Gold Fine</th>
                  <th>Silver Fine</th>
                  <th>Cash</th>
                  <th>Anamat</th>
                  <th>Bank</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      Loading account balance...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      {searchText ? 'No matching account found.' : 'No account balance found.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={record.id}>
                      <td>{index + 1}</td>
                      <td>{record.accountName}</td>
                      <td>{record.otherName || '-'}</td>
                      <td>{record.groupName}</td>
                      <td>{record.mobileNumber || '-'}</td>
                      <td>{record.city || '-'}</td>
                      <td>{formatNumber(record.goldFine)}</td>
                      <td>{formatNumber(record.silverFine)}</td>
                      <td>{formatNumber(record.cash)}</td>
                      <td>{formatNumber(record.anamat)}</td>
                      <td>{formatNumber(record.bank)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            This report shows current account balance after opening balance, sale bills, Dar/Jama
            payments, and cancelled bills.
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountBalanceReportScreen
