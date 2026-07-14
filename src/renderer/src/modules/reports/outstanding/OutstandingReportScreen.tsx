import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

const emptyTotals: OutstandingReportTotals = {
  goldFine: 0,
  silverFine: 0,
  cash: 0,
  anamat: 0,
  bank: 0
}

const emptyResult: OutstandingReportResult = {
  receivable: [],
  payable: [],
  receivableTotals: emptyTotals,
  payableTotals: emptyTotals
}

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

function formatDate(value: string | null): string {
  if (!value) return '-'

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function getTodayDisplayDate(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')

  return `${day}/${month}/${now.getFullYear()}`
}

function matchesSearch(record: OutstandingReportRecord, keyword: string): boolean {
  if (!keyword) return true

  return (
    record.accountName.toLowerCase().includes(keyword) ||
    record.otherName.toLowerCase().includes(keyword) ||
    record.mobileNumber.toLowerCase().includes(keyword) ||
    record.city.toLowerCase().includes(keyword) ||
    record.groupName.toLowerCase().includes(keyword)
  )
}

function OutstandingSection({
  title,
  records,
  totals,
  toneClass,
  emptyMessage
}: {
  title: string
  records: OutstandingReportRecord[]
  totals: OutstandingReportTotals
  toneClass: 'jama' | 'nave'
  emptyMessage: string
}): React.JSX.Element {
  return (
    <section className="outstanding-section">
      <h4>
        {title} <span className="outstanding-section-count">({records.length})</span>
      </h4>

      <div className="daily-summary-box-grid outstanding-totals-grid">
        <div className={toneClass}>
          <span>Gold Fine</span>
          <strong>{formatFine(totals.goldFine)}</strong>
        </div>
        <div className={toneClass}>
          <span>Silver Fine</span>
          <strong>{formatFine(totals.silverFine)}</strong>
        </div>
        <div className={toneClass}>
          <span>Cash</span>
          <strong>{formatAmount(totals.cash)}</strong>
        </div>
        <div className={toneClass}>
          <span>Anamat</span>
          <strong>{formatAmount(totals.anamat)}</strong>
        </div>
        <div className={toneClass}>
          <span>Bank</span>
          <strong>{formatAmount(totals.bank)}</strong>
        </div>
      </div>

      <div className="table-panel outstanding-table-panel">
        <table>
          <thead>
            <tr>
              <th>Sr</th>
              <th>Account</th>
              <th>Group</th>
              <th>Mobile</th>
              <th>City</th>
              <th>Gold Fine</th>
              <th>Silver Fine</th>
              <th>Cash</th>
              <th>Anamat</th>
              <th>Bank</th>
              <th>Last Txn</th>
              <th>Days</th>
            </tr>
          </thead>

          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={12} className="empty-row">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr key={record.id}>
                  <td>{index + 1}</td>
                  <td>{record.accountName}</td>
                  <td>{record.groupName}</td>
                  <td>{record.mobileNumber || '-'}</td>
                  <td>{record.city || '-'}</td>
                  <td>{formatFine(record.goldFine)}</td>
                  <td>{formatFine(record.silverFine)}</td>
                  <td>{formatAmount(record.cash)}</td>
                  <td>{formatAmount(record.anamat)}</td>
                  <td>{formatAmount(record.bank)}</td>
                  <td>{formatDate(record.lastTransactionDate)}</td>
                  <td>
                    {record.daysSinceLastTransaction === null
                      ? '-'
                      : record.daysSinceLastTransaction}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function OutstandingReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [result, setResult] = useState<OutstandingReportResult>(emptyResult)
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
      const data = await window.api.reports.outstanding()
      setResult(data || emptyResult)
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

  const filteredReceivable = useMemo(
    () => result.receivable.filter((record) => matchesSearch(record, keyword)),
    [result.receivable, keyword]
  )

  const filteredPayable = useMemo(
    () => result.payable.filter((record) => matchesSearch(record, keyword)),
    [result.payable, keyword]
  )

  const totalAccounts = result.receivable.length + result.payable.length
  const showingAccounts = filteredReceivable.length + filteredPayable.length

  return (
    <div className="fine-report-screen outstanding-report-screen">
      <div className="fine-report-window">
        <div className="form-title-bar no-print">
          <span>Outstanding Report</span>

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
              <label htmlFor="outstanding-search">Search</label>

              <input
                id="outstanding-search"
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
              Accounts: <strong>{totalAccounts}</strong> | Showing:{' '}
              <strong>{showingAccounts}</strong>
            </div>
          </div>

          <div className="fine-report-print-title">
            <h2>Outstanding Report</h2>
            <p>As of {getTodayDisplayDate()}</p>
          </div>

          <div className="outstanding-sections">
            <OutstandingSection
              title="Receivable — Party Owes Firm"
              records={filteredReceivable}
              totals={result.receivableTotals}
              toneClass="jama"
              emptyMessage={
                searchText ? 'No matching receivable account found.' : 'No receivable balance.'
              }
            />

            <OutstandingSection
              title="Payable — Firm Owes Party"
              records={filteredPayable}
              totals={result.payableTotals}
              toneClass="nave"
              emptyMessage={
                searchText ? 'No matching payable account found.' : 'No payable balance.'
              }
            />
          </div>

          <div className="screen-help-text no-print">
            Outstanding Report is built on top of Account Balance: only accounts with a non-zero
            gold fine, silver fine, cash, anamat or bank balance are shown, sorted with the
            largest outstanding accounts first. An account is grouped under Receivable when its
            dominant balance is positive (party owes the firm) and Payable when it is negative
            (firm owes the party). &quot;Days&quot; is the number of days since the account&apos;s
            last ledger entry; it is not a per-bill ageing breakup.
          </div>
        </div>
      </div>
    </div>
  )
}

export default OutstandingReportScreen
