import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type CashVoucherForm = {
  voucherType: CashVoucherType
  voucherDate: string
  accountId: string
  amount: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function formatNumber(value: number): string {
  return Number(value || 0).toFixed(2)
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function getVoucherTypeLabel(type: CashVoucherType): string {
  return type === 'RECEIPT' ? 'Cash Receipt' : 'Cash Payment'
}

function createInitialForm(voucherType: CashVoucherType): CashVoucherForm {
  return {
    voucherType,
    voucherDate: today,
    accountId: '',
    amount: '',
    narration: ''
  }
}

function CashVoucherScreen({
  initialVoucherType,
  onClose
}: {
  initialVoucherType: CashVoucherType
  onClose: () => void
}): React.JSX.Element {
  const [form, setForm] = useState<CashVoucherForm>(() => createInitialForm(initialVoucherType))
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [vouchers, setVouchers] = useState<CashVoucherRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CashVoucherRecord | null>(null)
  const [voucherNo, setVoucherNo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | CashVoucherType>('ALL')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const accountSelectRef = useRef<HTMLSelectElement | null>(null)
  const amountInputRef = useRef<HTMLInputElement | null>(null)
  const narrationInputRef = useRef<HTMLTextAreaElement | null>(null)

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const filteredVouchers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return vouchers.filter((voucher) => {
      const typeMatch = typeFilter === 'ALL' || voucher.voucherType === typeFilter
      const keywordMatch =
        !keyword ||
        voucher.voucherNo.toLowerCase().includes(keyword) ||
        voucher.accountName.toLowerCase().includes(keyword) ||
        voucher.voucherDate.toLowerCase().includes(keyword) ||
        voucher.narration.toLowerCase().includes(keyword) ||
        getVoucherTypeLabel(voucher.voucherType).toLowerCase().includes(keyword)

      return typeMatch && keywordMatch
    })
  }, [searchText, typeFilter, vouchers])

  const totals = useMemo(() => {
    return filteredVouchers.reduce(
      (total, voucher) => {
        if (voucher.voucherType === 'RECEIPT') {
          total.jama += Number(voucher.amount || 0)
        } else {
          total.nave += Number(voucher.amount || 0)
        }

        return total
      },
      { jama: 0, nave: 0 }
    )
  }, [filteredVouchers])

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

  const loadNextNumber = useCallback(async (voucherType: CashVoucherType): Promise<void> => {
    try {
      const nextNumber = await window.api.cashVoucher.getNextNumber(voucherType)
      setVoucherNo(nextNumber)
    } catch {
      setVoucherNo(voucherType === 'RECEIPT' ? 'CR-0001' : 'CP-0001')
    }
  }, [])

  const loadVouchers = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.cashVoucher.list({ voucherType: 'ALL' })
      setVouchers(data)
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
      await Promise.all([loadAccounts(), loadVouchers(), loadNextNumber(form.voucherType)])
    } finally {
      setLoading(false)
    }
  }, [form.voucherType, loadAccounts, loadNextNumber, loadVouchers])

  const handleNew = useCallback((): void => {
    const nextForm = createInitialForm(initialVoucherType)
    setEditingId(null)
    setAlertMessage('')
    setForm(nextForm)
    void loadNextNumber(nextForm.voucherType)

    window.setTimeout(() => {
      dateInputRef.current?.focus()
    }, 0)
  }, [initialVoucherType, loadNextNumber])

  const focusNextOnEnter = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    nextElement?.focus()
  }

  const handleVoucherTypeChange = (voucherType: CashVoucherType): void => {
    if (editingId) return

    setForm((current) => ({ ...current, voucherType }))
    void loadNextNumber(voucherType)
  }

  const validateForm = (): boolean => {
    if (!form.voucherDate) {
      showAlert('warning', 'Please select voucher date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.accountId) {
      showAlert('warning', 'Please select account.')
      accountSelectRef.current?.focus()
      return false
    }

    const amount = Number(form.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert('warning', 'Amount must be greater than 0.')
      amountInputRef.current?.focus()
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      const payload: CashVoucherPayload = {
        voucherType: form.voucherType,
        voucherDate: form.voucherDate,
        accountId: form.accountId,
        amount: Number(form.amount),
        narration: form.narration.trim()
      }

      const successMessage = editingId
        ? 'Cash voucher updated successfully.'
        : 'Cash voucher saved successfully.'

      if (editingId) {
        await window.api.cashVoucher.update(editingId, payload)
      } else {
        await window.api.cashVoucher.create(payload)
      }

      await loadVouchers()
      handleNew()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (voucher: CashVoucherRecord): void => {
    setEditingId(voucher.id)
    setAlertMessage('')
    setVoucherNo(voucher.voucherNo)
    setForm({
      voucherType: voucher.voucherType,
      voucherDate: voucher.voucherDate,
      accountId: voucher.accountId,
      amount: String(voucher.amount),
      narration: voucher.narration
    })

    window.setTimeout(() => {
      dateInputRef.current?.focus()
    }, 0)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.cashVoucher.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        handleNew()
      }

      setDeleteTarget(null)
      await loadVouchers()
      showAlert('success', 'Cash voucher deleted successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = (): void => {
    if (deleting) return
    setDeleteTarget(null)
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
  }, [loadScreenData])

  return (
    <div className="cash-voucher-screen">
      <div className="cash-voucher-window">
        <div className="form-title-bar">
          <span>Cash Receipt / Cash Payment</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="cash-voucher-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="cash-voucher-layout">
            <div className="cash-voucher-form-panel">
              <div className="section-title">{editingId ? 'Update Voucher' : 'New Voucher'}</div>

              <div className="voucher-type-toggle">
                <button
                  className={form.voucherType === 'RECEIPT' ? 'active receipt' : ''}
                  type="button"
                  onClick={() => handleVoucherTypeChange('RECEIPT')}
                  disabled={Boolean(editingId) || saving}
                >
                  <span>Cash Receipt</span>
                  <strong>Jama</strong>
                </button>

                <button
                  className={form.voucherType === 'PAYMENT' ? 'active payment' : ''}
                  type="button"
                  onClick={() => handleVoucherTypeChange('PAYMENT')}
                  disabled={Boolean(editingId) || saving}
                >
                  <span>Cash Payment</span>
                  <strong>Nave</strong>
                </button>
              </div>

              <div className="cash-voucher-no-box">
                <span>Voucher No</span>
                <strong>{voucherNo || '-'}</strong>
              </div>

              <div className="cash-voucher-form-grid">
                <div className="form-field">
                  <label htmlFor="cash-voucher-date">Date</label>
                  <input
                    id="cash-voucher-date"
                    ref={dateInputRef}
                    type="date"
                    value={form.voucherDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, voucherDate: event.target.value }))
                    }
                    onKeyDown={(event) => focusNextOnEnter(event, accountSelectRef.current)}
                    disabled={saving}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="cash-voucher-account">Account</label>
                  <select
                    id="cash-voucher-account"
                    ref={accountSelectRef}
                    value={form.accountId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, accountId: event.target.value }))
                    }
                    onKeyDown={(event) => focusNextOnEnter(event, amountInputRef.current)}
                    disabled={saving}
                  >
                    <option value="">Select Account</option>
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.accountName}
                        {account.mobileNumber ? ` - ${account.mobileNumber}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="cash-voucher-amount">Amount</label>
                  <input
                    id="cash-voucher-amount"
                    ref={amountInputRef}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, amount: event.target.value }))
                    }
                    onKeyDown={(event) => focusNextOnEnter(event, narrationInputRef.current)}
                    placeholder="Enter amount"
                    disabled={saving}
                  />
                </div>

                <div className="form-field full-field">
                  <label htmlFor="cash-voucher-narration">Narration</label>
                  <textarea
                    id="cash-voucher-narration"
                    ref={narrationInputRef}
                    value={form.narration}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, narration: event.target.value }))
                    }
                    placeholder="Enter narration"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="button-row cash-voucher-button-row">
                <button className="btn-new" type="button" onClick={handleNew} disabled={saving}>
                  New
                </button>

                <button
                  className="btn-save"
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                </button>

                {editingId && (
                  <button
                    className="btn-cancel-edit"
                    type="button"
                    onClick={handleNew}
                    disabled={saving}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div className="cash-voucher-list-panel">
              <div className="cash-voucher-toolbar">
                <div className="form-field">
                  <label htmlFor="cash-voucher-type-filter">Type</label>
                  <select
                    id="cash-voucher-type-filter"
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(event.target.value as 'ALL' | CashVoucherType)
                    }
                  >
                    <option value="ALL">All</option>
                    <option value="RECEIPT">Receipt</option>
                    <option value="PAYMENT">Payment</option>
                  </select>
                </div>

                <div className="list-search">
                  <label htmlFor="cash-voucher-search">Search</label>
                  <input
                    id="cash-voucher-search"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search no, account, narration"
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
                  onClick={() => void loadScreenData()}
                  disabled={loading}
                >
                  Refresh
                </button>

                <div className="record-summary">
                  Records: <strong>{vouchers.length}</strong> | Showing:{' '}
                  <strong>{filteredVouchers.length}</strong>
                </div>
              </div>

              <div className="cash-voucher-summary">
                <div>
                  <span>Receipt Jama</span>
                  <strong>{formatNumber(totals.jama)}</strong>
                </div>
                <div>
                  <span>Payment Nave</span>
                  <strong>{formatNumber(totals.nave)}</strong>
                </div>
              </div>

              <div className="table-panel cash-voucher-table-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Sr</th>
                      <th>Date</th>
                      <th>No</th>
                      <th>Type</th>
                      <th>Account</th>
                      <th>Nave</th>
                      <th>Jama</th>
                      <th>Narration</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="empty-row">
                          Loading vouchers...
                        </td>
                      </tr>
                    ) : filteredVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="empty-row">
                          {searchText ? 'No matching voucher found.' : 'No cash voucher found yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredVouchers.map((voucher, index) => {
                        const nave = voucher.voucherType === 'PAYMENT' ? voucher.amount : 0
                        const jama = voucher.voucherType === 'RECEIPT' ? voucher.amount : 0

                        return (
                          <tr key={voucher.id} onDoubleClick={() => handleEdit(voucher)}>
                            <td>{index + 1}</td>
                            <td>{formatDate(voucher.voucherDate)}</td>
                            <td>{voucher.voucherNo}</td>
                            <td>
                              <span
                                className={`cash-voucher-badge ${voucher.voucherType.toLowerCase()}`}
                              >
                                {voucher.voucherType === 'RECEIPT' ? 'Receipt' : 'Payment'}
                              </span>
                            </td>
                            <td>{voucher.accountName}</td>
                            <td>{nave ? formatNumber(nave) : '-'}</td>
                            <td>{jama ? formatNumber(jama) : '-'}</td>
                            <td>{voucher.narration || '-'}</td>
                            <td>
                              <div
                                className="sale-register-actions"
                                onDoubleClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  className="table-edit"
                                  type="button"
                                  onClick={() => handleEdit(voucher)}
                                  disabled={saving || deleting}
                                >
                                  Edit
                                </button>
                                <button
                                  className="table-delete"
                                  type="button"
                                  onClick={() => setDeleteTarget(voucher)}
                                  disabled={saving || deleting}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="screen-help-text">
                Cash Receipt posts Jama. Cash Payment posts Nave. Account balance updates through
                ledger.
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Cash Voucher?"
        message={
          deleteTarget
            ? `Voucher ${deleteTarget.voucherNo} will be deleted and its ledger effect will be removed.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default CashVoucherScreen
