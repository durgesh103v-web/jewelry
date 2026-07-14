import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

const emptySummary: FineRojmelSummary = {
  openingGoldBalance: 0,
  totalGoldIn: 0,
  totalGoldOut: 0,
  closingGoldBalance: 0,
  openingSilverBalance: 0,
  totalSilverIn: 0,
  totalSilverOut: 0,
  closingSilverBalance: 0
}

function formatFine(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function FineRojmelReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<FineRojmelRow[]>([])
  const [summary, setSummary] = useState<FineRojmelSummary>(emptySummary)
  const [metalFilter, setMetalFilter] = useState('All')
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
    if (fromDate && toDate && fromDate > toDate) {
      showAlert('warning', 'From date cannot be after to date.')
      return
    }

    try {
      setLoading(true)
      const result = await window.api.fineReport.rojmel({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
      setRows(result.rows || [])
      setSummary(result.summary || emptySummary)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, showAlert])

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

  const filteredRows = useMemo(() => {
    return rows.filter((row) => metalFilter === 'All' || row.metalType === metalFilter)
  }, [rows, metalFilter])

  return (
    <div className="fine-report-screen">
      <div className="fine-report-window">
        <div className="form-title-bar no-print">
          <span>Fine Rojmel</span>

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

          <div className="fine-report-toolbar no-print">
            <div className="form-field">
              <label htmlFor="fine-rojmel-from-date">From Date</label>
              <input
                id="fine-rojmel-from-date"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="fine-rojmel-to-date">To Date</label>
              <input
                id="fine-rojmel-to-date"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="fine-rojmel-metal-filter">Metal</label>
              <select
                id="fine-rojmel-metal-filter"
                value={metalFilter}
                onChange={(event) => setMetalFilter(event.target.value)}
              >
                <option>All</option>
                <option>Gold</option>
                <option>Silver</option>
              </select>
            </div>

            <div />

            <button
              className="btn-new"
              type="button"
              onClick={() => void loadReport()}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Show'}
            </button>

            <button className="btn-save" type="button" onClick={() => window.print()}>
              Print
            </button>

            <div className="record-summary">
              Records: <strong>{rows.length}</strong> | Showing:{' '}
              <strong>{filteredRows.length}</strong>
            </div>
          </div>

          <div className="fine-report-print-title">
            <h2>Fine Rojmel</h2>
            <p>
              From {fromDate ? formatDate(fromDate) : 'Beginning'} To{' '}
              {toDate ? formatDate(toDate) : 'Today'}
            </p>
          </div>

          <div className="fine-report-summary">
            <div>
              <span>Opening Gold Fine</span>
              <strong>{formatFine(summary.openingGoldBalance)}</strong>
            </div>
            <div className="jama">
              <span>Gold Fine In</span>
              <strong>{formatFine(summary.totalGoldIn)}</strong>
            </div>
            <div className="nave">
              <span>Gold Fine Out</span>
              <strong>{formatFine(summary.totalGoldOut)}</strong>
            </div>
            <div className="closing">
              <span>Closing Gold Fine</span>
              <strong>{formatFine(summary.closingGoldBalance)}</strong>
            </div>
            <div>
              <span>Opening Silver Fine</span>
              <strong>{formatFine(summary.openingSilverBalance)}</strong>
            </div>
            <div className="jama">
              <span>Silver Fine In</span>
              <strong>{formatFine(summary.totalSilverIn)}</strong>
            </div>
            <div className="nave">
              <span>Silver Fine Out</span>
              <strong>{formatFine(summary.totalSilverOut)}</strong>
            </div>
            <div className="closing">
              <span>Closing Silver Fine</span>
              <strong>{formatFine(summary.closingSilverBalance)}</strong>
            </div>
          </div>

          <div className="table-panel fine-rojmel-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Date</th>
                  <th>Metal</th>
                  <th>Fine In</th>
                  <th>Fine Out</th>
                  <th>Balance</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      Loading fine rojmel...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      No fine movement found for selected range.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{formatDate(row.entryDate)}</td>
                      <td>{row.metalType}</td>
                      <td>{row.fineIn ? formatFine(row.fineIn) : '-'}</td>
                      <td>{row.fineOut ? formatFine(row.fineOut) : '-'}</td>
                      <td>{formatFine(row.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text no-print">
            Fine Rojmel is a day-wise fine movement register built from the account ledger. Fine
            In comes from Purchase and Sale Return, Fine Out from Sale and Purchase Return, and
            the balance carries forward day to day for each metal, starting from the Cash Fine
            Opening entered in Master.
          </div>
        </div>
      </div>
    </div>
  )
}

export default FineRojmelReportScreen
