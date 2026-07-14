import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

const today = new Date().toISOString().slice(0, 10)

const emptySummary: PaymentReceiptSummary = {
  totalFineJama: 0,
  totalFineNave: 0,
  totalCashJama: 0,
  totalCashNave: 0,
  totalBankJama: 0,
  totalBankNave: 0,
  totalAnamatJama: 0,
  totalAnamatNave: 0,
  recordCount: 0
}

function formatFine(value: number): string {
  if (!value) return '-'
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatAmount(value: number): string {
  if (!value) return '-'
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatTotalFine(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatTotalAmount(value: number): string {
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

function PaymentReceiptReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [rows, setRows] = useState<PaymentReceiptRow[]>([])
  const [summary, setSummary] = useState<PaymentReceiptSummary>(emptySummary)
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
    if (!fromDate || !toDate) {
      showAlert('warning', 'Please select date range.')
      return
    }

    if (fromDate > toDate) {
      showAlert('warning', 'From date cannot be after to date.')
      return
    }

    try {
      setLoading(true)
      const result = await window.api.reports.paymentReceipt({ fromDate, toDate })
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
      const typeMatch = typeFilter === 'All' || row.sourceType === typeFilter
      const keywordMatch =
        !keyword ||
        row.voucherNo.toLowerCase().includes(keyword) ||
        row.accountName.toLowerCase().includes(keyword) ||
        row.narration.toLowerCase().includes(keyword)

      return typeMatch && keywordMatch
    })
  }, [rows, typeFilter, searchText])

  return (
    <div className="cash-book-screen payment-receipt-screen">
      <div className="cash-book-window">
        <div className="form-title-bar no-print">
          <span>Payment / Receipt</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="cash-book-body">
          <div className="no-print">
            <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
          </div>

          <div className="cash-book-toolbar payment-receipt-toolbar no-print">
            <div className="form-field">
              <label htmlFor="payment-receipt-from-date">From Date</label>
              <input
                id="payment-receipt-from-date"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="payment-receipt-to-date">To Date</label>
              <input
                id="payment-receipt-to-date"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="payment-receipt-type-filter">Type</label>
              <select
                id="payment-receipt-type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="All">All</option>
                <option value="SALE_PAYMENT">Sale Receipt</option>
                <option value="PURCHASE_PAYMENT">Purchase Payment</option>
                <option value="CASH_RECEIPT">Cash Receipt</option>
                <option value="CASH_PAYMENT">Cash Payment</option>
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="payment-receipt-search">Search</label>
              <input
                id="payment-receipt-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search voucher no, account, narration"
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
          </div>

          <div className="cash-book-print-title">
            <h2>Payment / Receipt</h2>
            <p>
              From {formatDate(fromDate)} To {formatDate(toDate)}
            </p>
          </div>

          <div className="cash-book-summary">
            <div>
              <span>Total Fine In</span>
              <strong>{formatTotalFine(summary.totalFineJama)}</strong>
            </div>
            <div>
              <span>Total Fine Out</span>
              <strong>{formatTotalFine(summary.totalFineNave)}</strong>
            </div>
            <div>
              <span>Total Cash In</span>
              <strong>{formatTotalAmount(summary.totalCashJama)}</strong>
            </div>
            <div>
              <span>Total Cash Out</span>
              <strong>{formatTotalAmount(summary.totalCashNave)}</strong>
            </div>
          </div>

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Date</th>
                  <th>Voucher / Bill No</th>
                  <th>Type</th>
                  <th>Account</th>
                  <th>Metal</th>
                  <th>Fine In</th>
                  <th>Fine Out</th>
                  <th>Cash In</th>
                  <th>Cash Out</th>
                  <th>Bank In</th>
                  <th>Bank Out</th>
                  <th>Anamat In</th>
                  <th>Anamat Out</th>
                  <th>Narration</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={15} className="empty-row">
                      Loading payment / receipt...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="empty-row">
                      No payment entries found for selected range.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{formatDate(row.entryDate)}</td>
                      <td>{row.voucherNo}</td>
                      <td>
                        <span className="cash-book-badge">{row.sourceLabel}</span>
                      </td>
                      <td>{row.accountName || '-'}</td>
                      <td>{row.metalType || '-'}</td>
                      <td>{formatFine(row.fineJama)}</td>
                      <td>{formatFine(row.fineNave)}</td>
                      <td>{formatAmount(row.cashJama)}</td>
                      <td>{formatAmount(row.cashNave)}</td>
                      <td>{formatAmount(row.bankJama)}</td>
                      <td>{formatAmount(row.bankNave)}</td>
                      <td>{formatAmount(row.anamatJama)}</td>
                      <td>{formatAmount(row.anamatNave)}</td>
                      <td>{row.narration || '-'}</td>
                    </tr>
                  ))
                )}

                <tr className="cash-book-total-row">
                  <td colSpan={6}>Total</td>
                  <td>{formatTotalFine(summary.totalFineJama)}</td>
                  <td>{formatTotalFine(summary.totalFineNave)}</td>
                  <td>{formatTotalAmount(summary.totalCashJama)}</td>
                  <td>{formatTotalAmount(summary.totalCashNave)}</td>
                  <td>{formatTotalAmount(summary.totalBankJama)}</td>
                  <td>{formatTotalAmount(summary.totalBankNave)}</td>
                  <td>{formatTotalAmount(summary.totalAnamatJama)}</td>
                  <td>{formatTotalAmount(summary.totalAnamatNave)}</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="screen-help-text no-print">
            Payment / Receipt lists every payment-leg ledger entry (Sale Receipt, Purchase
            Payment, Cash Receipt, Cash Payment) for the selected date range, showing the cash
            AND fine (metal weight) component of each entry together — unlike Cash Book, which is
            cash-only. Cash Receipt / Cash Payment vouchers never carry a fine component in this
            system, so their Fine In / Fine Out columns are always blank.
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentReceiptReportScreen
