import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type AccountGroup = {
  id: string
  groupName: string
  groupType: string
  description: string
  active: boolean
}

type Account = {
  id: string
  accountName: string
  otherName: string
  accountType: string
  accountGroupId: string
  groupName: string
  groupType: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  lastDate: string
  goldFineLimit: number
  silverFineLimit: number
  mobileNumber: string
  whatsappNumber: string
  phone2: string
  address: string
  city: string
  state: string
  gstNo: string
  panNo: string
  notification: string
  active: boolean
}

type AccountFormPayload = {
  accountName: string
  otherName: string
  accountType: string
  accountGroupId: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  lastDate: string
  goldFineLimit: number
  silverFineLimit: number
  mobileNumber: string
  whatsappNumber: string
  phone2: string
  address: string
  city: string
  state: string
  gstNo: string
  panNo: string
  notification: string
  active: boolean
}
const ACCOUNT_TYPES = [
  'Wholesale Customer',
  'Supplier / Karagir / Dhadi',
  'Other / Expense / Pigmi / Kharch',
  'Bank Account',
  'Retail Customer'
]

const today = new Date().toISOString().slice(0, 10)

const initialForm = {
  accountName: '',
  otherName: '',
  accountType: 'Wholesale Customer',
  accountGroupId: '',
  openingGoldFine: '',
  openingSilverFine: '',
  openingCash: '',
  openingAnamat: '',
  openingBank: '',
  lastDate: today,
  goldFineLimit: '',
  silverFineLimit: '',
  mobileNumber: '',
  whatsappNumber: '',
  phone2: '',
  address: '',
  city: '',
  state: 'Maharashtra',
  gstNo: '',
  panNo: '',
  notification: '',
  active: true
}

function toNumber(value: string | number): number {
  if (value === '') return 0

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function isValidAmountInput(value: string): boolean {
  return /^-?\d*\.?\d*$/.test(value)
}

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatDate(value: string): string {
  if (!value) return '-'

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function AccountMasterScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState('All')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const accountNameRef = useRef<HTMLInputElement | null>(null)

  const activeGroups = useMemo(() => {
    return accountGroups.filter((group) => group.active)
  }, [accountGroups])

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account.id === selectedAccountId) || null
  }, [accounts, selectedAccountId])

  const filteredAccounts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return accounts.filter((account) => {
      const typeMatch = accountTypeFilter === 'All' || account.accountType === accountTypeFilter
      const keywordMatch =
        !keyword ||
        account.accountName.toLowerCase().includes(keyword) ||
        account.otherName.toLowerCase().includes(keyword) ||
        account.accountType.toLowerCase().includes(keyword) ||
        account.groupName.toLowerCase().includes(keyword) ||
        account.groupType.toLowerCase().includes(keyword) ||
        account.mobileNumber.toLowerCase().includes(keyword) ||
        account.whatsappNumber.toLowerCase().includes(keyword) ||
        account.phone2.toLowerCase().includes(keyword) ||
        account.address.toLowerCase().includes(keyword) ||
        account.city.toLowerCase().includes(keyword) ||
        account.state.toLowerCase().includes(keyword) ||
        account.gstNo.toLowerCase().includes(keyword) ||
        account.panNo.toLowerCase().includes(keyword) ||
        account.notification.toLowerCase().includes(keyword)

      return typeMatch && keywordMatch
    })
  }, [accounts, searchText, accountTypeFilter])

  const activeCount = useMemo(() => {
    return accounts.filter((account) => account.active).length
  }, [accounts])

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

  const loadAccounts = useCallback(async (): Promise<void> => {
    const [groupData, accountData] = await Promise.all([
      window.api.accountGroups.list(),
      window.api.accounts.list()
    ])

    setAccountGroups(groupData)
    setAccounts(accountData)
  }, [])

  const focusName = useCallback((): void => {
    window.setTimeout(() => {
      accountNameRef.current?.focus()
    }, 0)
  }, [])

  const openNewForm = useCallback((): void => {
    const firstActiveGroup = activeGroups[0]

    setEditingId(null)
    setSelectedAccountId('')
    setAlertMessage('')
    setForm({
      ...initialForm,
      lastDate: new Date().toISOString().slice(0, 10),
      accountGroupId: firstActiveGroup?.id || ''
    })
    setFormOpen(true)
    focusName()
  }, [activeGroups, focusName])

  const closeForm = useCallback((): void => {
    setFormOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }, [])

  const updateForm = (field: keyof typeof initialForm, value: string | boolean): void => {
    setForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const updateAmountField = (
    field:
      | 'openingGoldFine'
      | 'openingSilverFine'
      | 'openingCash'
      | 'openingAnamat'
      | 'openingBank'
      | 'goldFineLimit'
      | 'silverFineLimit',
    value: string
  ): void => {
    if (!isValidAmountInput(value)) return
    updateForm(field, value)
  }

  const validateForm = useCallback((): boolean => {
    if (!form.accountName.trim()) {
      showAlert('warning', 'Please enter account name.')
      accountNameRef.current?.focus()
      return false
    }

    if (!form.accountGroupId) {
      showAlert('warning', 'Please select account group.')
      return false
    }

    return true
  }, [form.accountGroupId, form.accountName, showAlert])

  const buildPayload = useCallback((): AccountFormPayload => {
    return {
      accountName: form.accountName.trim(),
      otherName: form.otherName.trim(),
      accountType: form.accountType,
      accountGroupId: form.accountGroupId,
      openingGoldFine: toNumber(form.openingGoldFine),
      openingSilverFine: toNumber(form.openingSilverFine),
      openingCash: toNumber(form.openingCash),
      openingAnamat: toNumber(form.openingAnamat),
      openingBank: toNumber(form.openingBank),
      lastDate: form.lastDate,
      goldFineLimit: toNumber(form.goldFineLimit),
      silverFineLimit: toNumber(form.silverFineLimit),
      mobileNumber: form.mobileNumber.trim(),
      whatsappNumber: form.whatsappNumber.trim(),
      phone2: form.phone2.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      gstNo: form.gstNo.trim().toUpperCase(),
      panNo: form.panNo.trim().toUpperCase(),
      notification: form.notification.trim(),
      active: form.active
    }
  }, [form])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return
    if (!validateForm()) return

    try {
      setSaving(true)

      const payload = buildPayload()

      if (editingId) {
        await window.api.accounts.update(editingId, payload)
        showAlert('success', 'Account updated successfully.')
      } else {
        await window.api.accounts.create(payload)
        showAlert('success', 'Account saved successfully.')
      }

      await loadAccounts()
      closeForm()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [buildPayload, closeForm, editingId, loadAccounts, saving, showAlert, validateForm])

  const openEditForm = (account: Account): void => {
    setSelectedAccountId(account.id)
    setEditingId(account.id)
    setAlertMessage('')
    setForm({
      accountName: account.accountName || '',
      otherName: account.otherName || '',
      accountType: account.accountType || 'Wholesale Customer',
      accountGroupId: account.accountGroupId || '',
      openingGoldFine:
        Number(account.openingGoldFine || 0) === 0 ? '' : String(account.openingGoldFine),
      openingSilverFine:
        Number(account.openingSilverFine || 0) === 0 ? '' : String(account.openingSilverFine),
      openingCash: Number(account.openingCash || 0) === 0 ? '' : String(account.openingCash),
      openingAnamat: Number(account.openingAnamat || 0) === 0 ? '' : String(account.openingAnamat),
      openingBank: Number(account.openingBank || 0) === 0 ? '' : String(account.openingBank),
      lastDate: account.lastDate || new Date().toISOString().slice(0, 10),
      goldFineLimit: Number(account.goldFineLimit || 0) === 0 ? '' : String(account.goldFineLimit),
      silverFineLimit:
        Number(account.silverFineLimit || 0) === 0 ? '' : String(account.silverFineLimit),
      mobileNumber: account.mobileNumber || '',
      whatsappNumber: account.whatsappNumber || '',
      phone2: account.phone2 || '',
      address: account.address || '',
      city: account.city || '',
      state: account.state || 'Maharashtra',
      gstNo: account.gstNo || '',
      panNo: account.panNo || '',
      notification: account.notification || '',
      active: Boolean(account.active)
    })
    setFormOpen(true)
    focusName()
  }

  const handleToolbarEdit = (): void => {
    if (!selectedAccount) {
      showAlert('warning', 'Please select an account to edit.')
      return
    }

    openEditForm(selectedAccount)
  }

  const handleToolbarDelete = (): void => {
    if (!selectedAccount) {
      showAlert('warning', 'Please select an account to delete.')
      return
    }

    setDeleteTarget(selectedAccount)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.accounts.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        closeForm()
      }

      setDeleteTarget(null)
      setSelectedAccountId('')
      await loadAccounts()
      showAlert('success', 'Account deleted successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handlePrint = (): void => {
    window.print()
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([window.api.accountGroups.list(), window.api.accounts.list()])
      .then(([groupData, accountData]) => {
        if (cancelled) return

        setAccountGroups(groupData)
        setAccounts(accountData)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          showAlert('error', getFriendlyErrorMessage(error))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [showAlert])

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        openNewForm()
      }

      if (event.ctrlKey && event.key.toLowerCase() === 's' && formOpen) {
        event.preventDefault()
        void handleSave()
      }

      if (event.key === 'Escape') {
        if (deleteTarget && !deleting) {
          setDeleteTarget(null)
          return
        }

        if (formOpen) {
          closeForm()
        }
      }
    }

    window.addEventListener('keydown', handleKeyboard)

    return () => {
      window.removeEventListener('keydown', handleKeyboard)
    }
  }, [closeForm, deleteTarget, deleting, formOpen, handleSave, openNewForm])

  return (
    <div className="account-master-screen">
      <div className="account-master-window account-master-modern-window">
        <div className="form-title-bar">
          <span>Account Master</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-master-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="account-master-top-actions no-print">
            <button className="account-action-new" type="button" onClick={openNewForm}>
              Add New
            </button>

            <button className="account-action-btn" type="button" onClick={handleToolbarEdit}>
              Edit
            </button>

            <button className="account-action-btn" type="button" onClick={handlePrint}>
              Print
            </button>

            <button className="account-action-danger" type="button" onClick={handleToolbarDelete}>
              Delete
            </button>

            <button className="account-action-btn" type="button" onClick={onClose}>
              Exit
            </button>

            <div className="account-master-action-info">
              Selected: <strong>{selectedAccount ? selectedAccount.accountName : 'None'}</strong>
            </div>
          </div>

          {formOpen ? (
            <div className="account-master-modern-form">
              <div className="account-master-form-header">
                <div>
                  <h3>{editingId ? 'Edit Account' : 'Add New Account'}</h3>
                  <p>Enter account details, opening balance, limits, and contact information.</p>
                </div>

                <div className="account-form-header-actions">
                  <button
                    className="btn-save"
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : editingId ? 'Update Account' : 'Save Account'}
                  </button>

                  <button
                    className="btn-cancel-edit"
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="account-section-card">
                <div className="section-title">Basic Details</div>

                <div className="account-modern-grid">
                  <div className="form-field account-name-field">
                    <label>Name</label>
                    <input
                      ref={accountNameRef}
                      value={form.accountName}
                      onChange={(event) => updateForm('accountName', event.target.value)}
                      placeholder="Enter account name"
                    />
                  </div>

                  <div className="form-field">
                    <label>Other Name</label>
                    <input
                      value={form.otherName}
                      onChange={(event) => updateForm('otherName', event.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="form-field">
                    <label>Account Type</label>
                    <select
                      value={form.accountType}
                      onChange={(event) => updateForm('accountType', event.target.value)}
                    >
                      {ACCOUNT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Account Group</label>
                    <select
                      value={form.accountGroupId}
                      onChange={(event) => updateForm('accountGroupId', event.target.value)}
                    >
                      <option value="">Select Group</option>
                      {activeGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.groupName} - {group.groupType}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="account-section-card">
                <div className="section-title">Opening Balance</div>

                <div className="account-balance-modern-grid">
                  <div className="form-field">
                    <label>Gold Fine</label>
                    <input
                      value={form.openingGoldFine}
                      inputMode="decimal"
                      onChange={(event) => updateAmountField('openingGoldFine', event.target.value)}
                      placeholder="0 or -8000"
                    />
                  </div>

                  <div className="form-field">
                    <label>Silver Fine</label>
                    <input
                      value={form.openingSilverFine}
                      inputMode="decimal"
                      onChange={(event) =>
                        updateAmountField('openingSilverFine', event.target.value)
                      }
                      placeholder="0 or -8000"
                    />
                  </div>

                  <div className="form-field">
                    <label>Cash</label>
                    <input
                      value={form.openingCash}
                      inputMode="decimal"
                      onChange={(event) => updateAmountField('openingCash', event.target.value)}
                      placeholder="0 or -8000"
                    />
                  </div>

                  <div className="form-field">
                    <label>Anamat</label>
                    <input
                      value={form.openingAnamat}
                      inputMode="decimal"
                      onChange={(event) => updateAmountField('openingAnamat', event.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Bank</label>
                    <input
                      value={form.openingBank}
                      inputMode="decimal"
                      onChange={(event) => updateAmountField('openingBank', event.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Last Date</label>
                    <input
                      type="date"
                      value={form.lastDate}
                      onChange={(event) => updateForm('lastDate', event.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label>Gold Fine Limit</label>
                    <input
                      value={form.goldFineLimit}
                      inputMode="decimal"
                      onChange={(event) => updateAmountField('goldFineLimit', event.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Silver Fine Limit</label>
                    <input
                      value={form.silverFineLimit}
                      inputMode="decimal"
                      onChange={(event) => updateAmountField('silverFineLimit', event.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="account-section-card">
                <div className="section-title">Contact Details</div>

                <div className="account-modern-grid">
                  <div className="form-field">
                    <label>WhatsApp Number</label>
                    <input
                      value={form.whatsappNumber}
                      onChange={(event) => updateForm('whatsappNumber', event.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label>Phone 2</label>
                    <input
                      value={form.phone2}
                      onChange={(event) => updateForm('phone2', event.target.value)}
                    />
                  </div>

                  <div className="form-field account-address-field">
                    <label>Address</label>
                    <textarea
                      value={form.address}
                      onChange={(event) => updateForm('address', event.target.value)}
                      placeholder="Full address"
                    />
                  </div>

                  <div className="form-field">
                    <label>City</label>
                    <input
                      value={form.city}
                      onChange={(event) => updateForm('city', event.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label>State</label>
                    <input
                      value={form.state}
                      onChange={(event) => updateForm('state', event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="account-section-card">
                <div className="section-title">Tax / Other Details</div>

                <div className="account-modern-grid">
                  <div className="form-field">
                    <label>GST No.</label>
                    <input
                      value={form.gstNo}
                      onChange={(event) => updateForm('gstNo', event.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="form-field">
                    <label>PAN No.</label>
                    <input
                      value={form.panNo}
                      onChange={(event) => updateForm('panNo', event.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="form-field account-notification-field">
                    <label>Notification</label>
                    <input
                      value={form.notification}
                      onChange={(event) => updateForm('notification', event.target.value)}
                      placeholder="Reminder or note"
                    />
                  </div>

                  <div className="form-field">
                    <label>Active</label>
                    <select
                      value={form.active ? 'Yes' : 'No'}
                      onChange={(event) => updateForm('active', event.target.value === 'Yes')}
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="account-master-summary-row">
                <div>
                  <span>Total Accounts</span>
                  <strong>{accounts.length}</strong>
                </div>

                <div>
                  <span>Active</span>
                  <strong>{activeCount}</strong>
                </div>

                <div>
                  <span>Showing</span>
                  <strong>{filteredAccounts.length}</strong>
                </div>

                <div>
                  <span>Mode</span>
                  <strong>List</strong>
                </div>
              </div>

              <div className="list-toolbar account-master-list-toolbar no-print">
                <div className="form-field">
                  <label>Account Type</label>
                  <select
                    value={accountTypeFilter}
                    onChange={(event) => setAccountTypeFilter(event.target.value)}
                  >
                    <option value="All">All Types</option>
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="list-search">
                  <label>Search</label>
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search account, mobile, type, city, GST, PAN"
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
              </div>

              <div className="table-panel account-table-panel account-master-print-area">
                <table>
                  <thead>
                    <tr>
                      <th>Sr</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Group</th>
                      <th>Gold Fine</th>
                      <th>Silver Fine</th>
                      <th>Cash</th>
                      <th>Anamat</th>
                      <th>Bank</th>
                      <th>Last Date</th>
                      <th>Mobile</th>
                      <th>City</th>
                      <th>Active</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={13} className="empty-row">
                          Loading accounts...
                        </td>
                      </tr>
                    ) : filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="empty-row">
                          {searchText ? 'No matching account found.' : 'No account added yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((account, index) => (
                        <tr
                          key={account.id}
                          className={selectedAccountId === account.id ? 'selected-row' : ''}
                          onClick={() => setSelectedAccountId(account.id)}
                          onDoubleClick={() => openEditForm(account)}
                        >
                          <td>{index + 1}</td>
                          <td>
                            <strong>{account.accountName}</strong>
                            {account.otherName && (
                              <div className="account-sub-text">{account.otherName}</div>
                            )}
                          </td>
                          <td>{account.accountType || '-'}</td>
                          <td>{account.groupName || '-'}</td>
                          <td>{formatNumber(account.openingGoldFine)}</td>
                          <td>{formatNumber(account.openingSilverFine)}</td>
                          <td>{formatNumber(account.openingCash)}</td>
                          <td>{formatNumber(account.openingAnamat)}</td>
                          <td>{formatNumber(account.openingBank)}</td>
                          <td>{formatDate(account.lastDate)}</td>
                          <td>
                            {account.whatsappNumber || account.mobileNumber || '-'}
                            {account.phone2 && (
                              <div className="account-sub-text">P2: {account.phone2}</div>
                            )}
                          </td>
                          <td>{account.city || '-'}</td>
                          <td>
                            <span className={account.active ? 'status-active' : 'status-inactive'}>
                              {account.active ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="screen-help-text no-print">
                Click a row to select. Double-click to edit. Opening balances support positive and
                negative values like 8000 or -8000.
              </div>
            </>
          )}
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Account?"
        message={
          deleteTarget ? `Are you sure you want to delete "${deleteTarget.accountName}"?` : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null)
          }
        }}
      />
    </div>
  )
}

export default AccountMasterScreen
