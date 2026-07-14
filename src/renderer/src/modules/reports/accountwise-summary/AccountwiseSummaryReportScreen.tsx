import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function formatFine(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function matchesSearch(record: AccountwiseSummaryRecord, keyword: string): boolean {
  if (!keyword) return true

  return (
    record.accountName.toLowerCase().includes(keyword) ||
    record.otherName.toLowerCase().includes(keyword) ||
    record.mobileNumber.toLowerCase().includes(keyword) ||
    record.city.toLowerCase().includes(keyword) ||
    record.groupName.toLowerCase().includes(keyword)
  )
}

function AccountwiseSummaryReportScreen({
  onClose
}: {
  onClose: () => void
}): React.JSX.Element {
  const [records, setRecords] = useState<AccountwiseSummaryRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

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
      const data = await window.api.reports.accountwiseSummary()
      setRecords(data || [])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const keyword = searchText.trim().toLowerCase()

  const filteredRecords = useMemo(
    () => records.filter((record) => matchesSearch(record, keyword)),
    [records, keyword]
  )

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.totalSaleFine += record.totalSaleFine
        total.totalPurchaseFine += record.totalPurchaseFine
        total.goldFine += record.goldFine
        total.cash += record.cash
        return total
      },
      { totalSaleFine: 0, totalPurchaseFine: 0, goldFine: 0, cash: 0 }
    )
  }, [filteredRecords])

  return (
    <div className="fine-report-screen">
      <div className="fine-report-window">
        <div className="form-title-bar no-print">
          <span>Accountwise Summary</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="fine-report-body">
          <div className="no-print">
            <AppAlert
              type={alertType}
              message={alertMessage}
              onClose={() => setAlertMessage('')}
            />
          </div>

          <div className="fine-report-toolbar outstanding-toolbar no-print">
            <div className="list-search">
              <label htmlFor="accountwise-summary-search">Search</label>

              <input
                id="accountwise-summary-search"
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
              {loading ? 'Loading...' : 'Refresh'}
            </button>

            <button className="btn-save" type="button" onClick={() => window.print()}>
              Print
            </button>

            <div className="record-summary">
              Accounts: <strong>{records.length}</strong> | Showing:{' '}
              <strong>{filteredRecords.length}</strong>
            </div>
          </div>

          <div className="fine-report-print-title">
            <h2>Accountwise Summary</h2>
          </div>

          <div className="account-wise-sp-summary">
            <div>
              <span>Total Sale Fine</span>
              <strong>{formatFine(totals.totalSaleFine)}</strong>
            </div>
            <div>
              <span>Total Purchase Fine</span>
              <strong>{formatFine(totals.totalPurchaseFine)}</strong>
            </div>
            <div>
              <span>Total Gold Fine Balance</span>
              <strong>{formatFine(totals.goldFine)}</strong>
            </div>
            <div>
              <span>Total Cash Balance</span>
              <strong>{formatAmount(totals.cash)}</strong>
            </div>
            <div>
              <span>Showing</span>
              <strong>{filteredRecords.length}</strong>
            </div>
          </div>

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Account</th>
                  <th>Group</th>
                  <th>City</th>
                  <th>Sale Fine</th>
                  <th>Sale Value</th>
                  <th>Purchase Fine</th>
                  <th>Purchase Value</th>
                  <th>Gold Fine</th>
                  <th>Silver Fine</th>
                  <th>Cash</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      Loading accountwise summary...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      {searchText ? 'No matching account found.' : 'No accounts found yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={record.id}>
                      <td>{index + 1}</td>
                      <td>{record.accountName}</td>
                      <td>{record.groupName}</td>
                      <td>{record.city || '-'}</td>
                      <td>{formatFine(record.totalSaleFine)}</td>
                      <td>{formatAmount(record.totalSaleValue)}</td>
                      <td>{formatFine(record.totalPurchaseFine)}</td>
                      <td>{formatAmount(record.totalPurchaseValue)}</td>
                      <td>{formatFine(record.goldFine)}</td>
                      <td>{formatFine(record.silverFine)}</td>
                      <td>{formatAmount(record.cash)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text no-print">
            Accountwise Summary is a condensed, one-row-per-account view combining Account
            Balance (current gold/silver fine and cash balance) with lifetime Sale and Purchase
            totals per account. &quot;Value&quot; is the cash/labour (majuri) component of the
            bills — sale/purchase item lines carry fine weight plus majuri cash, but this system
            has no per-item trading rate to derive a true rupee sale value. For full transaction
            detail per account, use Accountwise Details or Party Statement.
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountwiseSummaryReportScreen
