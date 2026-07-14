import { useCallback, useEffect, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

const emptySummary: DailySummaryResult = {
  date: '',
  sales: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0, amountTotal: 0 },
  purchases: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0, amountTotal: 0 },
  saleReturns: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  purchaseReturns: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  cashReceipts: { count: 0, amountTotal: 0 },
  cashPayments: { count: 0, amountTotal: 0 },
  approvals: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  cash: { openingBalance: 0, totalReceipt: 0, totalPayment: 0, closingBalance: 0, netMovement: 0 },
  fine: { goldIn: 0, goldOut: 0, goldNet: 0, silverIn: 0, silverOut: 0, silverNet: 0 }
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatFine(value: number): string {
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

function DailySummaryReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [date, setDate] = useState(getTodayDate())
  const [summary, setSummary] = useState<DailySummaryResult>(emptySummary)
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
      const result = await window.api.dailyReport.summary({ date: date || undefined })
      setSummary(result || emptySummary)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [date, showAlert])

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

  return (
    <div className="fine-report-screen daily-summary-screen">
      <div className="fine-report-window">
        <div className="form-title-bar no-print">
          <span>Daily Summary Report</span>

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

          <div className="fine-report-toolbar daily-summary-toolbar no-print">
            <div className="form-field">
              <label htmlFor="daily-summary-date">Date</label>
              <input
                id="daily-summary-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
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
              Sale Bills: <strong>{summary.sales.count}</strong> | Purchase Bills:{' '}
              <strong>{summary.purchases.count}</strong>
            </div>
          </div>

          <div className="fine-report-print-title">
            <h2>Daily Summary Report</h2>
            <p>For {date ? formatDate(date) : 'Today'}</p>
          </div>

          <div className="daily-summary-sections">
            <div className="daily-summary-section">
              <h4>Sales</h4>
              <div className="daily-summary-box-grid">
                <div>
                  <span>Bills</span>
                  <strong>{summary.sales.count}</strong>
                </div>
                <div>
                  <span>Item Fine</span>
                  <strong>{formatFine(summary.sales.itemFineTotal)}</strong>
                </div>
                <div>
                  <span>Majuri</span>
                  <strong>{formatAmount(summary.sales.itemMajuriTotal)}</strong>
                </div>
                <div>
                  <span>Sale Amount</span>
                  <strong>{formatAmount(summary.sales.amountTotal)}</strong>
                </div>
              </div>
            </div>

            <div className="daily-summary-section">
              <h4>Purchases</h4>
              <div className="daily-summary-box-grid">
                <div>
                  <span>Bills</span>
                  <strong>{summary.purchases.count}</strong>
                </div>
                <div>
                  <span>Item Fine</span>
                  <strong>{formatFine(summary.purchases.itemFineTotal)}</strong>
                </div>
                <div>
                  <span>Majuri</span>
                  <strong>{formatAmount(summary.purchases.itemMajuriTotal)}</strong>
                </div>
                <div>
                  <span>Purchase Amount</span>
                  <strong>{formatAmount(summary.purchases.amountTotal)}</strong>
                </div>
              </div>
            </div>

            <div className="daily-summary-section">
              <h4>Sale Return</h4>
              <div className="daily-summary-box-grid daily-summary-box-grid-3">
                <div>
                  <span>Bills</span>
                  <strong>{summary.saleReturns.count}</strong>
                </div>
                <div>
                  <span>Item Fine</span>
                  <strong>{formatFine(summary.saleReturns.itemFineTotal)}</strong>
                </div>
                <div>
                  <span>Majuri</span>
                  <strong>{formatAmount(summary.saleReturns.itemMajuriTotal)}</strong>
                </div>
              </div>
            </div>

            <div className="daily-summary-section">
              <h4>Purchase Return</h4>
              <div className="daily-summary-box-grid daily-summary-box-grid-3">
                <div>
                  <span>Bills</span>
                  <strong>{summary.purchaseReturns.count}</strong>
                </div>
                <div>
                  <span>Item Fine</span>
                  <strong>{formatFine(summary.purchaseReturns.itemFineTotal)}</strong>
                </div>
                <div>
                  <span>Majuri</span>
                  <strong>{formatAmount(summary.purchaseReturns.itemMajuriTotal)}</strong>
                </div>
              </div>
            </div>

            <div className="daily-summary-section">
              <h4>Cash Receipt / Payment</h4>
              <div className="daily-summary-box-grid">
                <div className="jama">
                  <span>Receipts</span>
                  <strong>{summary.cashReceipts.count}</strong>
                </div>
                <div className="jama">
                  <span>Receipt Amount</span>
                  <strong>{formatAmount(summary.cashReceipts.amountTotal)}</strong>
                </div>
                <div className="nave">
                  <span>Payments</span>
                  <strong>{summary.cashPayments.count}</strong>
                </div>
                <div className="nave">
                  <span>Payment Amount</span>
                  <strong>{formatAmount(summary.cashPayments.amountTotal)}</strong>
                </div>
              </div>
            </div>

            <div className="daily-summary-section">
              <h4>Approvals Created</h4>
              <div className="daily-summary-box-grid daily-summary-box-grid-3">
                <div>
                  <span>Approvals</span>
                  <strong>{summary.approvals.count}</strong>
                </div>
                <div>
                  <span>Item Fine</span>
                  <strong>{formatFine(summary.approvals.itemFineTotal)}</strong>
                </div>
                <div>
                  <span>Majuri</span>
                  <strong>{formatAmount(summary.approvals.itemMajuriTotal)}</strong>
                </div>
              </div>
            </div>

            <div className="daily-summary-section daily-summary-section-wide">
              <h4>Cash In Hand (Overall)</h4>
              <div className="daily-summary-box-grid">
                <div>
                  <span>Opening Cash</span>
                  <strong>{formatAmount(summary.cash.openingBalance)}</strong>
                </div>
                <div className="jama">
                  <span>Total Receipt</span>
                  <strong>{formatAmount(summary.cash.totalReceipt)}</strong>
                </div>
                <div className="nave">
                  <span>Total Payment</span>
                  <strong>{formatAmount(summary.cash.totalPayment)}</strong>
                </div>
                <div className="closing">
                  <span>Closing Cash</span>
                  <strong>{formatAmount(summary.cash.closingBalance)}</strong>
                </div>
                <div className={summary.cash.netMovement >= 0 ? 'jama' : 'nave'}>
                  <span>Net Cash Movement</span>
                  <strong>{formatAmount(summary.cash.netMovement)}</strong>
                </div>
              </div>
            </div>

            <div className="daily-summary-section daily-summary-section-wide">
              <h4>Fine Movement</h4>
              <div className="daily-summary-box-grid">
                <div className="jama">
                  <span>Gold Fine In</span>
                  <strong>{formatFine(summary.fine.goldIn)}</strong>
                </div>
                <div className="nave">
                  <span>Gold Fine Out</span>
                  <strong>{formatFine(summary.fine.goldOut)}</strong>
                </div>
                <div className={summary.fine.goldNet >= 0 ? 'jama' : 'nave'}>
                  <span>Gold Net</span>
                  <strong>{formatFine(summary.fine.goldNet)}</strong>
                </div>
                <div className="jama">
                  <span>Silver Fine In</span>
                  <strong>{formatFine(summary.fine.silverIn)}</strong>
                </div>
                <div className="nave">
                  <span>Silver Fine Out</span>
                  <strong>{formatFine(summary.fine.silverOut)}</strong>
                </div>
                <div className={summary.fine.silverNet >= 0 ? 'jama' : 'nave'}>
                  <span>Silver Net</span>
                  <strong>{formatFine(summary.fine.silverNet)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="screen-help-text no-print">
            Daily Summary Report shows a single-day snapshot of Sale, Purchase, Sale Return,
            Purchase Return, Cash Receipt / Payment and Approval activity, along with the overall
            cash-in-hand and net fine movement for the selected date. Cash In Hand reuses the same
            opening/closing balance computation as Cash Book for the same date, and Fine Movement
            is built from the account ledger for Sale, Purchase, Sale Return and Purchase Return
            entries.
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailySummaryReportScreen
