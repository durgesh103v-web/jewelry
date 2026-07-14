import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

const emptySummary: FineMarginSummary = {
  totalNetWeight: 0,
  totalFine: 0,
  totalMajuri: 0,
  totalWastageFineValue: 0,
  recordCount: 0
}

function formatWeight(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function FineMarginReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<FineMarginRow[]>([])
  const [, setSummary] = useState<FineMarginSummary>(emptySummary)
  const [searchText, setSearchText] = useState('')
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
      const result = await window.api.fineReport.margin({
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
    const keyword = searchText.trim().toLowerCase()

    return rows.filter((row) => {
      const metalMatch = metalFilter === 'All' || row.metalType === metalFilter
      const keywordMatch =
        !keyword ||
        row.billNo.toLowerCase().includes(keyword) ||
        row.accountName.toLowerCase().includes(keyword) ||
        row.itemName.toLowerCase().includes(keyword)

      return metalMatch && keywordMatch
    })
  }, [rows, searchText, metalFilter])

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (total, row) => {
        total.netWeight += Number(row.netWeight || 0)
        total.fine += Number(row.fine || 0)
        total.majuri += Number(row.majuri || 0)
        total.wastageFineValue += Number(row.wastageFineValue || 0)
        return total
      },
      { netWeight: 0, fine: 0, majuri: 0, wastageFineValue: 0 }
    )
  }, [filteredRows])

  return (
    <div className="fine-report-screen">
      <div className="fine-report-window">
        <div className="form-title-bar no-print">
          <span>Fine Margin</span>

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
              <label htmlFor="fine-margin-from-date">From Date</label>
              <input
                id="fine-margin-from-date"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="fine-margin-to-date">To Date</label>
              <input
                id="fine-margin-to-date"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="fine-margin-metal-filter">Metal</label>
              <select
                id="fine-margin-metal-filter"
                value={metalFilter}
                onChange={(event) => setMetalFilter(event.target.value)}
              >
                <option>All</option>
                <option>Gold</option>
                <option>Silver</option>
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="fine-margin-search">Search</label>
              <input
                id="fine-margin-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill no, customer, item"
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
            <h2>Fine Margin</h2>
            <p>
              From {fromDate ? formatDate(fromDate) : 'Beginning'} To{' '}
              {toDate ? formatDate(toDate) : 'Today'}
              {searchText ? ` | Search Filter: ${searchText}` : ''}
            </p>
          </div>

          <div className="fine-report-summary fine-margin-summary">
            <div>
              <span>Net Weight</span>
              <strong>{formatWeight(totals.netWeight)}</strong>
            </div>
            <div>
              <span>Total Fine</span>
              <strong>{formatWeight(totals.fine)}</strong>
            </div>
            <div>
              <span>Total Majuri</span>
              <strong>{formatAmount(totals.majuri)}</strong>
            </div>
            <div className="closing">
              <span>Wastage Fine (Margin)</span>
              <strong>{formatWeight(totals.wastageFineValue)}</strong>
            </div>
          </div>

          <div className="table-panel fine-margin-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Date</th>
                  <th>Bill No</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Metal</th>
                  <th>Net Wt</th>
                  <th>Tunch</th>
                  <th>Wastage</th>
                  <th>Hishob</th>
                  <th>Fine</th>
                  <th>Majuri</th>
                  <th>Wastage Fine (Margin)</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="empty-row">
                      Loading fine margin report...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="empty-row">
                      {searchText
                        ? 'No matching sale item found.'
                        : 'No sale item found for selected range.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{formatDate(row.billDate)}</td>
                      <td>{row.billNo}</td>
                      <td>{row.accountName}</td>
                      <td>{row.itemName}</td>
                      <td>{row.metalType}</td>
                      <td>{formatWeight(row.netWeight)}</td>
                      <td>{formatWeight(row.tunch)}</td>
                      <td>{formatWeight(row.wastage)}</td>
                      <td>{formatWeight(row.hishob)}</td>
                      <td>{formatWeight(row.fine)}</td>
                      <td>{formatAmount(row.majuri)}</td>
                      <td>{formatWeight(row.wastageFineValue)}</td>
                    </tr>
                  ))
                )}

                {!loading && filteredRows.length > 0 && (
                  <tr className="fine-report-total-row">
                    <td colSpan={6}>Total</td>
                    <td>{formatWeight(totals.netWeight)}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>{formatWeight(totals.fine)}</td>
                    <td>{formatAmount(totals.majuri)}</td>
                    <td>{formatWeight(totals.wastageFineValue)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text no-print">
            Fine Margin surfaces the wastage-driven margin on every sale item line. Hishob = Tunch
            + Wastage, Fine = Net Weight x Hishob %. Wastage Fine (Margin) = Net Weight x Wastage %
            and represents the wholesaler&apos;s markup over raw metal purity.
          </div>
        </div>
      </div>
    </div>
  )
}

export default FineMarginReportScreen
