import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type SaudaForm = {
  saudaDate: string
  accountId: string
  metalType: string
  transactionType: string
  fine: string
  rate: string
  deliveryDate: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function createInitialForm(): SaudaForm {
  return {
    saudaDate: today,
    accountId: '',
    metalType: 'Gold',
    transactionType: 'BUY',
    fine: '',
    rate: '',
    deliveryDate: '',
    narration: ''
  }
}

function formatWeight(value: number): string {
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

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function statusBadgeClass(status: string): string {
  if (status === 'CLOSED') return 'approval-badge completed'
  if (status === 'CANCELLED') return 'approval-badge cancelled'
  return 'approval-badge pending'
}

function SaudaBookScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState<SaudaForm>(() => createInitialForm())
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [entries, setEntries] = useState<SaudaRecord[]>([])
  const [saudaNo, setSaudaNo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [closeTarget, setCloseTarget] = useState<SaudaRecord | null>(null)
  const [closing, setClosing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SaudaRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const accountInputRef = useRef<HTMLSelectElement | null>(null)

  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])

  const filteredEntries = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return entries

    return entries.filter((entry) => {
      return (
        entry.saudaNo.toLowerCase().includes(keyword) ||
        entry.accountName.toLowerCase().includes(keyword) ||
        entry.narration.toLowerCase().includes(keyword) ||
        entry.saudaDate.toLowerCase().includes(keyword)
      )
    })
  }, [searchText, entries])

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

  const loadNextNumber = useCallback(async (): Promise<void> => {
    try {
      const nextNumber = await window.api.sauda.getNextNumber()
      setSaudaNo(nextNumber)
    } catch {
      setSaudaNo('SD-0001')
    }
  }, [])

  const loadEntries = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.sauda.list()
      setEntries(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }, [showAlert])

  const loadAccounts = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.accounts.list()
      setAccounts(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }, [showAlert])

  const loadScreenData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadEntries(), loadNextNumber()])
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadEntries, loadNextNumber])

  const handleNew = useCallback((): void => {
    setForm(createInitialForm())
    setAlertMessage('')
    void loadNextNumber()

    window.setTimeout(() => {
      dateInputRef.current?.focus()
    }, 0)
  }, [loadNextNumber])

  const validateForm = (): boolean => {
    if (!form.saudaDate) {
      showAlert('warning', 'Please select sauda date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.accountId) {
      showAlert('warning', 'Please select account.')
      accountInputRef.current?.focus()
      return false
    }

    if (!Number(form.fine || 0) || Number(form.fine) <= 0) {
      showAlert('warning', 'Enter fine greater than 0.')
      return false
    }

    if (!Number(form.rate || 0) || Number(form.rate) <= 0) {
      showAlert('warning', 'Enter rate greater than 0.')
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      await window.api.sauda.create({
        saudaDate: form.saudaDate,
        accountId: form.accountId,
        metalType: form.metalType,
        transactionType: form.transactionType,
        fine: Number(form.fine || 0),
        rate: Number(form.rate || 0),
        deliveryDate: form.deliveryDate,
        narration: form.narration.trim()
      })

      await loadEntries()
      handleNew()
      showAlert('success', 'Sauda entry saved successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmClose = async (): Promise<void> => {
    if (!closeTarget) return

    try {
      setClosing(true)
      await window.api.sauda.close(closeTarget.id)
      setCloseTarget(null)
      await loadEntries()
      showAlert('success', 'Sauda entry marked as closed.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setClosing(false)
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.sauda.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadEntries()
      showAlert('success', 'Sauda entry deleted successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadScreenData()
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
    <div className="cash-voucher-screen sauda-book-screen">
      <div className="cash-voucher-window">
        <div className="form-title-bar">
          <span>Sauda Book</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="cash-voucher-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="cash-voucher-layout">
            <div className="cash-voucher-form-panel">
              <div className="cash-voucher-no-box">
                <span>Sauda No.</span>
                <strong>{saudaNo || '-'}</strong>
              </div>

              <div className="cash-voucher-form-grid">
                <div className="form-field">
                  <label>Sauda Date</label>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={form.saudaDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, saudaDate: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Account</label>
                  <select
                    ref={accountInputRef}
                    value={form.accountId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, accountId: event.target.value }))
                    }
                  >
                    <option value="">Select Account</option>
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Metal Type</label>
                  <select
                    value={form.metalType}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, metalType: event.target.value }))
                    }
                  >
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Transaction Type</label>
                  <select
                    value={form.transactionType}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, transactionType: event.target.value }))
                    }
                  >
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Fine</label>
                  <input
                    value={form.fine}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, fine: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Rate</label>
                  <input
                    value={form.rate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, rate: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Amount</label>
                  <input
                    value={formatAmount(Number(form.fine || 0) * Number(form.rate || 0))}
                    readOnly
                    disabled
                  />
                </div>

                <div className="form-field">
                  <label>Delivery Date</label>
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, deliveryDate: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field full-field">
                  <label>Narration</label>
                  <textarea
                    value={form.narration}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, narration: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="cash-voucher-button-row">
                <button
                  className="btn-save"
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Sauda'}
                </button>
                <button className="btn-new" type="button" onClick={handleNew} disabled={saving}>
                  New
                </button>
              </div>
            </div>

            <div className="cash-voucher-list-panel">
              <div className="list-search">
                <label htmlFor="sauda-search">Search</label>
                <input
                  id="sauda-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search sauda no, account, narration"
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

              <div className="table-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Sr</th>
                      <th>Date</th>
                      <th>Sauda No</th>
                      <th>Account</th>
                      <th>Type</th>
                      <th>Fine</th>
                      <th>Rate</th>
                      <th>Amount</th>
                      <th>Delivery</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="empty-row">
                          Loading sauda entries...
                        </td>
                      </tr>
                    ) : filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="empty-row">
                          {searchText ? 'No matching sauda entry found.' : 'No sauda entry found yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry, index) => (
                        <tr key={entry.id}>
                          <td>{index + 1}</td>
                          <td>{formatDate(entry.saudaDate)}</td>
                          <td>{entry.saudaNo}</td>
                          <td>{entry.accountName}</td>
                          <td>
                            {entry.transactionType} ({entry.metalType})
                          </td>
                          <td>{formatWeight(entry.fine)}</td>
                          <td>{formatAmount(entry.rate)}</td>
                          <td>{formatAmount(entry.amount)}</td>
                          <td>{formatDate(entry.deliveryDate)}</td>
                          <td>
                            <span className={statusBadgeClass(entry.status)}>{entry.status}</span>
                          </td>
                          <td>
                            {entry.status === 'OPEN' && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => setCloseTarget(entry)}
                              >
                                Close
                              </button>
                            )}
                            <button
                              className="table-delete"
                              type="button"
                              onClick={() => setDeleteTarget(entry)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="screen-help-text">
                Sauda Book records a forward rate-lock deal at a fixed rate for future delivery. It is
                a booking record only - no stock or account ledger is posted here. Mark it Closed once
                the deal is fulfilled through an actual Purchase/Sale entry.
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(closeTarget)}
        title="Close Sauda Entry?"
        message={closeTarget ? `Sauda ${closeTarget.saudaNo} will be marked as Closed.` : ''}
        confirmText="Close Sauda"
        cancelText="Cancel"
        type="info"
        loading={closing}
        onConfirm={() => void handleConfirmClose()}
        onCancel={() => setCloseTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Sauda Entry?"
        message={deleteTarget ? `Sauda ${deleteTarget.saudaNo} will be deleted.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default SaudaBookScreen
