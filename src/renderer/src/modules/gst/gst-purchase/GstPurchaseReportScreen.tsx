import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

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

function GstPurchaseReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<GstReportRow[]>([])
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
      const data = await window.api.gstReport.purchases({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
      setRows(data || [])
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
        row.gstNo.toLowerCase().includes(keyword) ||
        row.billDate.toLowerCase().includes(keyword)

      return metalMatch && keywordMatch
    })
  }, [rows, searchText, metalFilter])

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (total, row) => {
        total.taxableAmount += Number(row.taxableAmount || 0)
        total.cgstAmount += Number(row.cgstAmount || 0)
        total.sgstAmount += Number(row.sgstAmount || 0)
        total.igstAmount += Number(row.igstAmount || 0)
        total.totalTax += Number(row.totalTax || 0)
        total.totalAmount += Number(row.totalAmount || 0)
        return total
      },
      {
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
        totalAmount: 0
      }
    )
  }, [filteredRows])

  return (
    <div className="gst-report-screen">
      <div className="gst-report-window">
        <div className="form-title-bar no-print">
          <span>GST Purchase</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="gst-report-body">
          <div className="no-print">
            <AppAlert
              type={alertType}
              message={alertMessage}
              onClose={() => setAlertMessage('')}
            />
          </div>

          <div className="gst-report-toolbar no-print">
            <div className="form-field">
              <label htmlFor="gst-purchase-from-date">From Date</label>
              <input
                id="gst-purchase-from-date"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="gst-purchase-to-date">To Date</label>
              <input
                id="gst-purchase-to-date"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="gst-purchase-metal-filter">Metal</label>
              <select
                id="gst-purchase-metal-filter"
                value={metalFilter}
                onChange={(event) => setMetalFilter(event.target.value)}
              >
                <option>All</option>
                <option>Gold</option>
                <option>Silver</option>
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="gst-purchase-search">Search</label>
              <input
                id="gst-purchase-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill no, supplier, GST no"
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

          <div className="gst-report-print-title">
            <h2>GST Purchase Report</h2>
            <p>
              From {fromDate ? formatDate(fromDate) : 'Beginning'} To{' '}
              {toDate ? formatDate(toDate) : 'Today'}
              {searchText ? ` | Search Filter: ${searchText}` : ''}
            </p>
          </div>

          <div className="gst-report-summary">
            <div>
              <span>Taxable Amt</span>
              <strong>{formatAmount(totals.taxableAmount)}</strong>
            </div>
            <div>
              <span>CGST</span>
              <strong>{formatAmount(totals.cgstAmount)}</strong>
            </div>
            <div>
              <span>SGST</span>
              <strong>{formatAmount(totals.sgstAmount)}</strong>
            </div>
            <div>
              <span>IGST</span>
              <strong>{formatAmount(totals.igstAmount)}</strong>
            </div>
            <div>
              <span>Total Tax</span>
              <strong>{formatAmount(totals.totalTax)}</strong>
            </div>
            <div>
              <span>Total Amount</span>
              <strong>{formatAmount(totals.totalAmount)}</strong>
            </div>
          </div>

          <div className="table-panel gst-report-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Date</th>
                  <th>Bill No</th>
                  <th>Supplier</th>
                  <th>GST No</th>
                  <th>Metal</th>
                  <th>Taxable Amt</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                  <th>Total Tax</th>
                  <th>Total Amount</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="empty-row">
                      Loading GST purchase report...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="empty-row">
                      {searchText
                        ? 'No matching purchase found.'
                        : 'No purchase found for selected range.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{formatDate(row.billDate)}</td>
                      <td>{row.billNo}</td>
                      <td>{row.accountName}</td>
                      <td>{row.gstNo || '-'}</td>
                      <td>{row.metalType}</td>
                      <td>{formatAmount(row.taxableAmount)}</td>
                      <td>{formatAmount(row.cgstAmount)}</td>
                      <td>{formatAmount(row.sgstAmount)}</td>
                      <td>{formatAmount(row.igstAmount)}</td>
                      <td>{formatAmount(row.totalTax)}</td>
                      <td>{formatAmount(row.totalAmount)}</td>
                    </tr>
                  ))
                )}

                {!loading && filteredRows.length > 0 && (
                  <tr className="gst-report-total-row">
                    <td colSpan={6}>Total</td>
                    <td>{formatAmount(totals.taxableAmount)}</td>
                    <td>{formatAmount(totals.cgstAmount)}</td>
                    <td>{formatAmount(totals.sgstAmount)}</td>
                    <td>{formatAmount(totals.igstAmount)}</td>
                    <td>{formatAmount(totals.totalTax)}</td>
                    <td>{formatAmount(totals.totalAmount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text no-print">
            GST Purchase Report shows taxable amount and CGST / SGST / IGST split captured on each
            purchase bill. Amounts show zero until GST fields are captured during Purchase entry.
          </div>
        </div>
      </div>
    </div>
  )
}

export default GstPurchaseReportScreen
