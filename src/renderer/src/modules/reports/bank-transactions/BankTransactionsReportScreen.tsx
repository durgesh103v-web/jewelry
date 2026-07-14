import { useCallback, useEffect, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

const today = new Date().toISOString().slice(0, 10)

const emptySummary: BankTransactionsReportSummary = {
  openingBalance: 0,
  totalReceipt: 0,
  totalPayment: 0,
  closingBalance: 0
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

function BankTransactionsReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [rows, setRows] = useState<BankTransactionsReportRow[]>([])
  const [summary, setSummary] = useState<BankTransactionsReportSummary>(emptySummary)
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
      const result = await window.api.reports.bankTransactions({ fromDate, toDate })
      setRows(result.rows || [])
      setSummary(result.summary || emptySummary)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [fromDate, showAlert, toDate])

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
    <div className="cash-book-screen bank-transactions-screen">
      <div className="cash-book-window">
        <div className="form-title-bar no-print">
          <span>Bank Transactions</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="cash-book-body">
          <div className="no-print">
            <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
          </div>

          <div className="cash-book-toolbar no-print">
            <div className="form-field">
              <label htmlFor="bank-txn-from-date">From Date</label>
              <input
                id="bank-txn-from-date"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="bank-txn-to-date">To Date</label>
              <input
                id="bank-txn-to-date"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
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
            <h2>Bank Transactions Report</h2>
            <p>
              From {formatDate(fromDate)} To {formatDate(toDate)}
            </p>
          </div>

          <div className="cash-book-summary">
            <div>
              <span>Opening Balance</span>
              <strong>{formatAmount(summary.openingBalance)}</strong>
            </div>
            <div className="receipt">
              <span>Total Receipt</span>
              <strong>{formatAmount(summary.totalReceipt)}</strong>
            </div>
            <div className="payment">
              <span>Total Payment</span>
              <strong>{formatAmount(summary.totalPayment)}</strong>
            </div>
            <div className="closing">
              <span>Closing Balance</span>
              <strong>{formatAmount(summary.closingBalance)}</strong>
            </div>
          </div>

          <div className="table-panel cash-book-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bill / Voucher No</th>
                  <th>Type</th>
                  <th>Particular</th>
                  <th>Narration</th>
                  <th>Receipt</th>
                  <th>Payment</th>
                  <th>Balance</th>
                </tr>
              </thead>

              <tbody>
                <tr className="cash-book-opening-row">
                  <td>{formatDate(fromDate)}</td>
                  <td>-</td>
                  <td>Opening</td>
                  <td>Opening Bank Balance</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>{formatAmount(summary.openingBalance)}</td>
                </tr>

                {loading ? (
                  <tr>
                    <td colSpan={8} className="empty-row">
                      Loading bank transactions...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-row">
                      No bank entries found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.voucherDate)}</td>
                      <td>{row.voucherNo}</td>
                      <td>
                        <span className={`cash-book-badge ${row.voucherType.toLowerCase()}`}>
                          {row.sourceLabel ||
                            (row.voucherType === 'RECEIPT' ? 'Receipt' : 'Payment')}
                        </span>
                      </td>
                      <td>{row.accountName || '-'}</td>
                      <td>{row.narration || '-'}</td>
                      <td>{row.receiptAmount ? formatAmount(row.receiptAmount) : '-'}</td>
                      <td>{row.paymentAmount ? formatAmount(row.paymentAmount) : '-'}</td>
                      <td>{formatAmount(row.runningBalance)}</td>
                    </tr>
                  ))
                )}

                <tr className="cash-book-total-row">
                  <td colSpan={5}>Total</td>
                  <td>{formatAmount(summary.totalReceipt)}</td>
                  <td>{formatAmount(summary.totalPayment)}</td>
                  <td>{formatAmount(summary.closingBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="screen-help-text no-print">
            Bank Transactions is calculated from ledger bank movement across Sale/Purchase
            payments, Transfers and Settlements. Opening balance is derived from all bank-related
            ledger entries before the From Date.
          </div>
        </div>
      </div>
    </div>
  )
}

export default BankTransactionsReportScreen
