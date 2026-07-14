import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type TransferForm = {
  transferDate: string
  fromAccountId: string
  toAccountId: string
  metalType: string
  goldFine: string
  silverFine: string
  cash: string
  bank: string
  anamat: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function createInitialForm(): TransferForm {
  return {
    transferDate: today,
    fromAccountId: '',
    toAccountId: '',
    metalType: '',
    goldFine: '',
    silverFine: '',
    cash: '',
    bank: '',
    anamat: '',
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

function TransferScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState<TransferForm>(() => createInitialForm())
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [transfers, setTransfers] = useState<TransferRecord[]>([])
  const [transferNo, setTransferNo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TransferRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const fromAccountRef = useRef<HTMLSelectElement | null>(null)

  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])

  const filteredTransfers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return transfers

    return transfers.filter((transfer) => {
      return (
        transfer.transferNo.toLowerCase().includes(keyword) ||
        transfer.fromAccountName.toLowerCase().includes(keyword) ||
        transfer.toAccountName.toLowerCase().includes(keyword) ||
        transfer.narration.toLowerCase().includes(keyword) ||
        transfer.transferDate.toLowerCase().includes(keyword)
      )
    })
  }, [searchText, transfers])

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
      const nextNumber = await window.api.transfers.getNextNumber()
      setTransferNo(nextNumber)
    } catch {
      setTransferNo('TR-0001')
    }
  }, [])

  const loadTransfers = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.transfers.list()
      setTransfers(data)
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
      await Promise.all([loadAccounts(), loadTransfers(), loadNextNumber()])
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadTransfers, loadNextNumber])

  const handleNew = useCallback((): void => {
    setForm(createInitialForm())
    setAlertMessage('')
    void loadNextNumber()

    window.setTimeout(() => {
      dateInputRef.current?.focus()
    }, 0)
  }, [loadNextNumber])

  const validateForm = (): boolean => {
    if (!form.transferDate) {
      showAlert('warning', 'Please select transfer date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.fromAccountId) {
      showAlert('warning', 'Please select From account.')
      fromAccountRef.current?.focus()
      return false
    }

    if (!form.toAccountId) {
      showAlert('warning', 'Please select To account.')
      return false
    }

    if (form.fromAccountId === form.toAccountId) {
      showAlert('warning', 'From and To accounts must be different.')
      return false
    }

    const total =
      Number(form.goldFine || 0) +
      Number(form.silverFine || 0) +
      Number(form.cash || 0) +
      Number(form.bank || 0) +
      Number(form.anamat || 0)

    if (!Number.isFinite(total) || total <= 0) {
      showAlert('warning', 'Enter at least one transfer amount.')
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      await window.api.transfers.create({
        transferDate: form.transferDate,
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        metalType: form.metalType,
        goldFine: Number(form.goldFine || 0),
        silverFine: Number(form.silverFine || 0),
        cash: Number(form.cash || 0),
        bank: Number(form.bank || 0),
        anamat: Number(form.anamat || 0),
        narration: form.narration.trim()
      })

      await loadTransfers()
      handleNew()
      showAlert('success', 'Transfer saved successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.transfers.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadTransfers()
      showAlert('success', 'Transfer deleted successfully.')
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
    <div className="cash-voucher-screen transfer-screen">
      <div className="cash-voucher-window">
        <div className="form-title-bar">
          <span>Transfer</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="cash-voucher-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="cash-voucher-layout">
            <div className="cash-voucher-form-panel">
              <div className="cash-voucher-no-box">
                <span>Transfer No.</span>
                <strong>{transferNo || '-'}</strong>
              </div>

              <div className="cash-voucher-form-grid">
                <div className="form-field">
                  <label>Transfer Date</label>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={form.transferDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, transferDate: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>From Account</label>
                  <select
                    ref={fromAccountRef}
                    value={form.fromAccountId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, fromAccountId: event.target.value }))
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
                  <label>To Account</label>
                  <select
                    value={form.toAccountId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, toAccountId: event.target.value }))
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
                    <option value="">-</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Gold Fine</label>
                  <input
                    value={form.goldFine}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, goldFine: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Silver Fine</label>
                  <input
                    value={form.silverFine}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, silverFine: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Cash</label>
                  <input
                    value={form.cash}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, cash: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Bank</label>
                  <input
                    value={form.bank}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, bank: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Anamat</label>
                  <input
                    value={form.anamat}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, anamat: event.target.value }))
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
                  {saving ? 'Saving...' : 'Save Transfer'}
                </button>
                <button className="btn-new" type="button" onClick={handleNew} disabled={saving}>
                  New
                </button>
              </div>
            </div>

            <div className="cash-voucher-list-panel">
              <div className="list-search">
                <label htmlFor="transfer-search">Search</label>
                <input
                  id="transfer-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search transfer no, account, narration"
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
                      <th>Transfer No</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Gold Fine</th>
                      <th>Silver Fine</th>
                      <th>Cash</th>
                      <th>Bank</th>
                      <th>Anamat</th>
                      <th>Narration</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="empty-row">
                          Loading transfers...
                        </td>
                      </tr>
                    ) : filteredTransfers.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="empty-row">
                          {searchText ? 'No matching transfer found.' : 'No transfer found yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredTransfers.map((transfer, index) => (
                        <tr key={transfer.id}>
                          <td>{index + 1}</td>
                          <td>{formatDate(transfer.transferDate)}</td>
                          <td>{transfer.transferNo}</td>
                          <td>{transfer.fromAccountName}</td>
                          <td>{transfer.toAccountName}</td>
                          <td>{transfer.goldFine ? formatWeight(transfer.goldFine) : '-'}</td>
                          <td>{transfer.silverFine ? formatWeight(transfer.silverFine) : '-'}</td>
                          <td>{transfer.cash ? formatAmount(transfer.cash) : '-'}</td>
                          <td>{transfer.bank ? formatAmount(transfer.bank) : '-'}</td>
                          <td>{transfer.anamat ? formatAmount(transfer.anamat) : '-'}</td>
                          <td>{transfer.narration || '-'}</td>
                          <td>
                            <button
                              className="table-delete"
                              type="button"
                              onClick={() => setDeleteTarget(transfer)}
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
                Transfer moves gold/silver fine, cash, bank or anamat balance from one account to
                another. Posts Nave on From account and Jama on To account.
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Transfer?"
        message={
          deleteTarget
            ? `Transfer ${deleteTarget.transferNo} will be deleted and its ledger effect will be removed.`
            : ''
        }
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

export default TransferScreen
