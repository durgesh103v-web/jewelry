import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function VoidReasonDialog({
  open,
  bill,
  reason,
  onReasonChange,
  loading,
  onConfirm,
  onCancel
}: {
  open: boolean
  bill: SaleDeleteListRecord | null
  reason: string
  onReasonChange: (value: string) => void
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element | null {
  if (!open || !bill) return null

  const trimmedReason = reason.trim()

  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog void-reason-dialog">
        <div className="confirm-icon confirm-icon-danger">!</div>

        <div className="confirm-content">
          <h3>Delete / Void Sale Bill?</h3>
          <p>
            You are about to void bill <strong>{bill.sale_no}</strong> for{' '}
            <strong>{bill.account_name}</strong>. This will reverse its stock and account ledger
            effect and remove it from active reports. This action cannot be undone from here.
          </p>

          <div className="void-reason-field">
            <label htmlFor="void-reason">
              Reason for deletion <span className="required-mark">*</span>
            </label>
            <textarea
              id="void-reason"
              rows={3}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="e.g. Entered by mistake, duplicate bill, customer cancelled order..."
              autoFocus
            />
          </div>
        </div>

        <div className="confirm-actions">
          <button className="confirm-cancel-btn" type="button" onClick={onCancel} disabled={loading}>
            Close
          </button>

          <button
            className="confirm-ok-btn confirm-ok-danger"
            type="button"
            onClick={onConfirm}
            disabled={loading || trimmedReason.length < 3}
          >
            {loading ? 'Please wait...' : 'Delete Bill'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteSaleBillsScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [bills, setBills] = useState<SaleDeleteListRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [voidTarget, setVoidTarget] = useState<SaleDeleteListRecord | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const [loading, setLoading] = useState(false)
  const [voiding, setVoiding] = useState(false)

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
    }, 3500)
  }, [])

  const loadBills = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.sales.listAllForDelete()
      setBills(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadBills()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadBills])

  const filteredBills = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return bills.filter((bill) => {
      if (fromDate && bill.sale_date < fromDate) return false
      if (toDate && bill.sale_date > toDate) return false

      if (!keyword) return true

      return (
        bill.sale_no.toLowerCase().includes(keyword) ||
        bill.account_name.toLowerCase().includes(keyword) ||
        bill.mobile_number.toLowerCase().includes(keyword) ||
        bill.status.toLowerCase().includes(keyword)
      )
    })
  }, [bills, searchText, fromDate, toDate])

  const requestVoid = (bill: SaleDeleteListRecord): void => {
    setVoidReason('')
    setVoidTarget(bill)
  }

  const closeVoidDialog = (): void => {
    if (voiding) return
    setVoidTarget(null)
    setVoidReason('')
  }

  const handleConfirmVoid = async (): Promise<void> => {
    if (!voidTarget || voidReason.trim().length < 3) return

    try {
      setVoiding(true)
      const result = await window.api.sales.cancel(voidTarget.id, voidReason.trim())

      setVoidTarget(null)
      setVoidReason('')
      await loadBills()
      showAlert('success', `Sale bill ${result.saleNo} deleted/voided successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setVoiding(false)
    }
  }

  return (
    <div className="sale-register-screen">
      <div className="sale-register-window">
        <div className="form-title-bar">
          <span>Delete Sale Bills</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="sale-register-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="restricted-usage-note">
            <strong>Restricted utility.</strong> Deleting/voiding a sale bill reverses its stock
            and account ledger effect permanently. Use only to correct genuine mistakes (duplicate
            entry, wrong account, etc.), not for routine editing. A reason is mandatory and is
            saved with the bill for audit.
          </div>

          <div className="sale-register-toolbar">
            <div className="list-search">
              <label htmlFor="delete-sale-search">Search</label>

              <input
                id="delete-sale-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill no, account, mobile, status"
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

            <label htmlFor="delete-sale-from">From</label>
            <input
              id="delete-sale-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />

            <label htmlFor="delete-sale-to">To</label>
            <input
              id="delete-sale-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />

            <button
              className="btn-new"
              type="button"
              onClick={() => void loadBills()}
              disabled={loading}
            >
              Refresh
            </button>

            <div className="record-summary">
              Total Bills: <strong>{bills.length}</strong> | Showing:{' '}
              <strong>{filteredBills.length}</strong>
            </div>
          </div>

          <div className="table-panel sale-register-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Bill No</th>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Mobile</th>
                  <th>Metal</th>
                  <th>Fine</th>
                  <th>Majuri</th>
                  <th>Status</th>
                  <th>Void Reason</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      Loading sale bills...
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      {searchText || fromDate || toDate
                        ? 'No matching sale bill found.'
                        : 'No sale bill saved yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill, index) => (
                    <tr key={bill.id}>
                      <td>{index + 1}</td>
                      <td>{bill.sale_no}</td>
                      <td>{formatDate(bill.sale_date)}</td>
                      <td>{bill.account_name}</td>
                      <td>{bill.mobile_number || '-'}</td>
                      <td>{bill.metal_type}</td>
                      <td>{formatNumber(bill.item_fine_total)}</td>
                      <td>{formatNumber(bill.item_majuri_total)}</td>
                      <td>
                        <span
                          className={`approval-badge ${
                            bill.status === 'ACTIVE' ? 'approved' : 'cancelled'
                          }`}
                        >
                          {bill.status === 'ACTIVE' ? 'Active' : 'Voided'}
                        </span>
                      </td>
                      <td>{bill.void_reason || '-'}</td>
                      <td>
                        <button
                          className="table-delete"
                          type="button"
                          onClick={() => requestVoid(bill)}
                          disabled={bill.status !== 'ACTIVE' || voiding}
                        >
                          {bill.status === 'ACTIVE' ? 'Delete / Void' : 'Already Voided'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            Voided bills are excluded from Sale Register, Account Balance, Outstanding and Stock
            Report totals automatically, and remain visible here (marked Voided) for audit.
          </div>
        </div>
      </div>

      <VoidReasonDialog
        open={Boolean(voidTarget)}
        bill={voidTarget}
        reason={voidReason}
        onReasonChange={setVoidReason}
        loading={voiding}
        onConfirm={() => void handleConfirmVoid()}
        onCancel={closeVoidDialog}
      />
    </div>
  )
}

export default DeleteSaleBillsScreen
