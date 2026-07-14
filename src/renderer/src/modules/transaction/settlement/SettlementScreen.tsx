import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type SettlementForm = {
  settlementDate: string
  accountId: string
  metalType: string
  goldFine: string
  silverFine: string
  cash: string
  bank: string
  anamat: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function createInitialForm(): SettlementForm {
  return {
    settlementDate: today,
    accountId: '',
    metalType: 'Gold',
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

function SettlementScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState<SettlementForm>(() => createInitialForm())
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [settlements, setSettlements] = useState<SettlementRecord[]>([])
  const [settlementNo, setSettlementNo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SettlementRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const accountInputRef = useRef<HTMLSelectElement | null>(null)

  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])

  const filteredSettlements = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return settlements

    return settlements.filter((settlement) => {
      return (
        settlement.settlementNo.toLowerCase().includes(keyword) ||
        settlement.accountName.toLowerCase().includes(keyword) ||
        settlement.narration.toLowerCase().includes(keyword) ||
        settlement.settlementDate.toLowerCase().includes(keyword)
      )
    })
  }, [searchText, settlements])

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
      const nextNumber = await window.api.settlements.getNextNumber()
      setSettlementNo(nextNumber)
    } catch {
      setSettlementNo('ST-0001')
    }
  }, [])

  const loadSettlements = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.settlements.list()
      setSettlements(data)
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
      await Promise.all([loadAccounts(), loadSettlements(), loadNextNumber()])
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadSettlements, loadNextNumber])

  const handleNew = useCallback((): void => {
    setForm(createInitialForm())
    setAlertMessage('')
    void loadNextNumber()

    window.setTimeout(() => {
      dateInputRef.current?.focus()
    }, 0)
  }, [loadNextNumber])

  const validateForm = (): boolean => {
    if (!form.settlementDate) {
      showAlert('warning', 'Please select settlement date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.accountId) {
      showAlert('warning', 'Please select account.')
      accountInputRef.current?.focus()
      return false
    }

    const total =
      Number(form.goldFine || 0) +
      Number(form.silverFine || 0) +
      Number(form.cash || 0) +
      Number(form.bank || 0) +
      Number(form.anamat || 0)

    if (!Number.isFinite(total) || total <= 0) {
      showAlert('warning', 'Enter at least one settlement amount.')
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      await window.api.settlements.create({
        settlementDate: form.settlementDate,
        accountId: form.accountId,
        metalType: form.metalType,
        goldFine: Number(form.goldFine || 0),
        silverFine: Number(form.silverFine || 0),
        cash: Number(form.cash || 0),
        bank: Number(form.bank || 0),
        anamat: Number(form.anamat || 0),
        narration: form.narration.trim()
      })

      await loadSettlements()
      handleNew()
      showAlert('success', 'Settlement saved successfully.')
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
      await window.api.settlements.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadSettlements()
      showAlert('success', 'Settlement deleted successfully.')
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
    <div className="cash-voucher-screen settlement-screen">
      <div className="cash-voucher-window">
        <div className="form-title-bar">
          <span>Settlement</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="cash-voucher-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="cash-voucher-layout">
            <div className="cash-voucher-form-panel">
              <div className="cash-voucher-no-box">
                <span>Settlement No.</span>
                <strong>{settlementNo || '-'}</strong>
              </div>

              <div className="cash-voucher-form-grid">
                <div className="form-field">
                  <label>Settlement Date</label>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={form.settlementDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, settlementDate: event.target.value }))
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
                  {saving ? 'Saving...' : 'Save Settlement'}
                </button>
                <button className="btn-new" type="button" onClick={handleNew} disabled={saving}>
                  New
                </button>
              </div>
            </div>

            <div className="cash-voucher-list-panel">
              <div className="list-search">
                <label htmlFor="settlement-search">Search</label>
                <input
                  id="settlement-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search settlement no, account, narration"
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
                      <th>Settlement No</th>
                      <th>Account</th>
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
                        <td colSpan={11} className="empty-row">
                          Loading settlements...
                        </td>
                      </tr>
                    ) : filteredSettlements.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="empty-row">
                          {searchText ? 'No matching settlement found.' : 'No settlement found yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredSettlements.map((settlement, index) => (
                        <tr key={settlement.id}>
                          <td>{index + 1}</td>
                          <td>{formatDate(settlement.settlementDate)}</td>
                          <td>{settlement.settlementNo}</td>
                          <td>{settlement.accountName}</td>
                          <td>{settlement.goldFine ? formatWeight(settlement.goldFine) : '-'}</td>
                          <td>{settlement.silverFine ? formatWeight(settlement.silverFine) : '-'}</td>
                          <td>{settlement.cash ? formatAmount(settlement.cash) : '-'}</td>
                          <td>{settlement.bank ? formatAmount(settlement.bank) : '-'}</td>
                          <td>{settlement.anamat ? formatAmount(settlement.anamat) : '-'}</td>
                          <td>{settlement.narration || '-'}</td>
                          <td>
                            <button
                              className="table-delete"
                              type="button"
                              onClick={() => setDeleteTarget(settlement)}
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
                Settlement records a manual balance adjustment for a single account - write-off,
                rounding, or agreed conversion. It always posts Jama (credit) on the selected account.
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Settlement?"
        message={
          deleteTarget
            ? `Settlement ${deleteTarget.settlementNo} will be deleted and its ledger effect will be removed.`
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

export default SettlementScreen
