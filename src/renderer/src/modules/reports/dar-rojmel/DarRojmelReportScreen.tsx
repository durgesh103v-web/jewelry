import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

const emptySummary: DarRojmelSummary = {
  totalFine: 0,
  totalAmount: 0,
  saudaCount: 0,
  recordCount: 0
}

function formatFine(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatAmount(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatRate(value: number | null): string {
  if (value === null || value === undefined) return '-'
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

function getTransactionLabel(type: string): string {
  if (type === 'SALE') return 'Sale'
  if (type === 'PURCHASE') return 'Purchase'
  if (type === 'SAUDA') return 'Sauda'
  return type
}

type DayGroup = {
  entryDate: string
  rows: DarRojmelRow[]
  totalFine: number
  totalAmount: number
}

function groupRowsByDay(rows: DarRojmelRow[]): DayGroup[] {
  const groups: DayGroup[] = []
  let currentGroup: DayGroup | null = null

  for (const row of rows) {
    if (!currentGroup || currentGroup.entryDate !== row.entryDate) {
      currentGroup = { entryDate: row.entryDate, rows: [], totalFine: 0, totalAmount: 0 }
      groups.push(currentGroup)
    }

    currentGroup.rows.push(row)
    currentGroup.totalFine += Number(row.fine || 0)
    currentGroup.totalAmount += Number(row.amount || 0)
  }

  return groups
}

function DarRojmelReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<DarRojmelRow[]>([])
  const [summary, setSummary] = useState<DarRojmelSummary>(emptySummary)
  const [typeFilter, setTypeFilter] = useState('All')
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
    if (fromDate && toDate && fromDate > toDate) {
      showAlert('warning', 'From date cannot be after to date.')
      return
    }

    try {
      setLoading(true)
      const result = await window.api.reports.darRojmel({
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
      const typeMatch = typeFilter === 'All' || row.transactionType === typeFilter
      const keywordMatch =
        !keyword ||
        row.billNo.toLowerCase().includes(keyword) ||
        row.accountName.toLowerCase().includes(keyword) ||
        row.metalType.toLowerCase().includes(keyword)

      return typeMatch && keywordMatch
    })
  }, [rows, typeFilter, searchText])

  const dayGroups = useMemo(() => groupRowsByDay(filteredRows), [filteredRows])

  return (
    <div className="fine-report-screen">
      <div className="fine-report-window">
        <div className="form-title-bar no-print">
          <span>Dar Rojmel</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="fine-report-body">
          <div className="no-print">
            <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
          </div>

          <div className="fine-report-toolbar no-print">
            <div className="form-field">
              <label htmlFor="dar-rojmel-from-date">From Date</label>
              <input
                id="dar-rojmel-from-date"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="dar-rojmel-to-date">To Date</label>
              <input
                id="dar-rojmel-to-date"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="dar-rojmel-type-filter">Type</label>
              <select
                id="dar-rojmel-type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="All">All</option>
                <option value="SALE">Sale</option>
                <option value="PURCHASE">Purchase</option>
                <option value="SAUDA">Sauda</option>
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="dar-rojmel-search">Search</label>
              <input
                id="dar-rojmel-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill no, account, metal"
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
            <h2>Dar Rojmel</h2>
            <p>
              From {fromDate ? formatDate(fromDate) : 'Beginning'} To{' '}
              {toDate ? formatDate(toDate) : 'Today'}
            </p>
          </div>

          <div className="fine-report-summary">
            <div>
              <span>Total Fine</span>
              <strong>{formatFine(summary.totalFine)}</strong>
            </div>
            <div>
              <span>Total Sauda Amount</span>
              <strong>{formatAmount(summary.totalAmount)}</strong>
            </div>
            <div>
              <span>Sauda Entries</span>
              <strong>{summary.saudaCount}</strong>
            </div>
            <div>
              <span>Total Records</span>
              <strong>{summary.recordCount}</strong>
            </div>
          </div>

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Bill No</th>
                  <th>Account</th>
                  <th>Metal</th>
                  <th>Fine</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="empty-row">
                      Loading Dar Rojmel...
                    </td>
                  </tr>
                ) : dayGroups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-row">
                      No rate-based dealings found for selected range.
                    </td>
                  </tr>
                ) : (
                  dayGroups.map((group) => {
                    let srNo = 0

                    return (
                      <Fragment key={group.entryDate}>
                        {group.rows.map((row) => {
                          srNo += 1
                          return (
                            <tr key={row.id}>
                              <td>{srNo}</td>
                              <td>{formatDate(row.entryDate)}</td>
                              <td>{getTransactionLabel(row.transactionType)}</td>
                              <td>{row.billNo}</td>
                              <td>{row.accountName}</td>
                              <td>{row.metalType}</td>
                              <td>{formatFine(row.fine)}</td>
                              <td>{formatRate(row.rate)}</td>
                              <td>{formatAmount(row.amount)}</td>
                            </tr>
                          )
                        })}
                        <tr key={`${group.entryDate}-subtotal`} className="cash-book-total-row">
                          <td colSpan={6}>{formatDate(group.entryDate)} — Day Total</td>
                          <td>{formatFine(group.totalFine)}</td>
                          <td>-</td>
                          <td>{formatAmount(group.totalAmount)}</td>
                        </tr>
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text no-print">
            Dar Rojmel lists every rate-based dealing day-wise, grouped with a sub-total per day.
            Sauda Book entries carry a real trading Rate and Amount as recorded at entry time.
            Sale and Purchase bills do not carry a per-item trading rate anywhere in this system
            (only the fine-to-cash conversion rate on the payment section of a bill exists, which
            is a different figure) — so Sale and Purchase rows here show Date / Account / Metal /
            Fine only, with Rate and Amount displayed as &quot;-&quot;.
          </div>
        </div>
      </div>
    </div>
  )
}

export default DarRojmelReportScreen
