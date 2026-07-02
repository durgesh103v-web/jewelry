import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
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
  accountGroupId: string
  groupName: string
  groupType: string
  mobileNumber: string
  whatsappNumber: string
  city: string
  state: string
  gstNo: string
  panNo: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  active: boolean
}

const initialForm = {
  accountName: '',
  otherName: '',
  accountGroupId: '',
  mobileNumber: '',
  whatsappNumber: '',
  city: '',
  state: '',
  gstNo: '',
  panNo: '',
  openingGoldFine: '',
  openingSilverFine: '',
  openingCash: '',
  openingAnamat: '',
  openingBank: '',
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

function AccountMasterScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const accountNameInputRef = useRef<HTMLInputElement | null>(null)
  const otherNameInputRef = useRef<HTMLInputElement | null>(null)
  const accountGroupSelectRef = useRef<HTMLSelectElement | null>(null)
  const mobileInputRef = useRef<HTMLInputElement | null>(null)
  const whatsappInputRef = useRef<HTMLInputElement | null>(null)
  const cityInputRef = useRef<HTMLInputElement | null>(null)
  const stateInputRef = useRef<HTMLInputElement | null>(null)
  const gstInputRef = useRef<HTMLInputElement | null>(null)
  const panInputRef = useRef<HTMLInputElement | null>(null)
  const goldFineInputRef = useRef<HTMLInputElement | null>(null)
  const silverFineInputRef = useRef<HTMLInputElement | null>(null)
  const cashInputRef = useRef<HTMLInputElement | null>(null)
  const anamatInputRef = useRef<HTMLInputElement | null>(null)
  const bankInputRef = useRef<HTMLInputElement | null>(null)
  const activeCheckboxRef = useRef<HTMLInputElement | null>(null)

  const activeGroups = useMemo(() => {
    return accountGroups.filter((group) => group.active)
  }, [accountGroups])

  const filteredAccounts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return accounts

    return accounts.filter((account) => {
      return (
        account.accountName.toLowerCase().includes(keyword) ||
        account.otherName.toLowerCase().includes(keyword) ||
        account.groupName.toLowerCase().includes(keyword) ||
        account.groupType.toLowerCase().includes(keyword) ||
        account.mobileNumber.toLowerCase().includes(keyword) ||
        account.whatsappNumber.toLowerCase().includes(keyword) ||
        account.city.toLowerCase().includes(keyword) ||
        account.state.toLowerCase().includes(keyword) ||
        account.gstNo.toLowerCase().includes(keyword) ||
        account.panNo.toLowerCase().includes(keyword)
      )
    })
  }, [accounts, searchText])

  const activeCount = useMemo(() => {
    return accounts.filter((account) => account.active).length
  }, [accounts])

  const focusAccountName = useCallback((): void => {
    window.setTimeout(() => {
      accountNameInputRef.current?.focus()
    }, 0)
  }, [])

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

  const focusNextOnEnter = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    nextElement?.focus()
  }

  const loadAccounts = useCallback(async (): Promise<void> => {
    const data = await window.api.accounts.list()
    setAccounts(data)
  }, [])

  const handleNew = useCallback((): void => {
    const firstActiveGroup = activeGroups[0]

    setEditingId(null)
    setAlertMessage('')
    setForm({
      ...initialForm,
      accountGroupId: firstActiveGroup?.id ?? ''
    })

    focusAccountName()
  }, [activeGroups, focusAccountName])

  const validateForm = useCallback((): boolean => {
    if (!form.accountName.trim()) {
      showAlert('warning', 'Please enter account name.')
      accountNameInputRef.current?.focus()
      return false
    }

    if (!form.accountGroupId) {
      showAlert('warning', 'Please select account group.')
      accountGroupSelectRef.current?.focus()
      return false
    }

    return true
  }, [form.accountGroupId, form.accountName, showAlert])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return
    if (!validateForm()) return

    try {
      setSaving(true)

      const payload = {
        ...form,
        accountName: form.accountName.trim(),
        otherName: form.otherName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        gstNo: form.gstNo.trim().toUpperCase(),
        panNo: form.panNo.trim().toUpperCase(),
        openingGoldFine: toNumber(form.openingGoldFine),
        openingSilverFine: toNumber(form.openingSilverFine),
        openingCash: toNumber(form.openingCash),
        openingAnamat: toNumber(form.openingAnamat),
        openingBank: toNumber(form.openingBank)
      }

      const successMessage = editingId
        ? 'Account updated successfully.'
        : 'Account saved successfully.'

      if (editingId) {
        await window.api.accounts.update(editingId, payload)
      } else {
        await window.api.accounts.create(payload)
      }

      await loadAccounts()
      handleNew()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, form, handleNew, loadAccounts, saving, showAlert, validateForm])

  const handleEdit = (account: Account): void => {
    setEditingId(account.id)
    setAlertMessage('')
    setForm({
      accountName: account.accountName,
      otherName: account.otherName,
      accountGroupId: account.accountGroupId,
      mobileNumber: account.mobileNumber,
      whatsappNumber: account.whatsappNumber,
      city: account.city,
      state: account.state,
      gstNo: account.gstNo,
      panNo: account.panNo,
      openingGoldFine: account.openingGoldFine === 0 ? '' : String(account.openingGoldFine),
      openingSilverFine: account.openingSilverFine === 0 ? '' : String(account.openingSilverFine),
      openingCash: account.openingCash === 0 ? '' : String(account.openingCash),
      openingAnamat: account.openingAnamat === 0 ? '' : String(account.openingAnamat),
      openingBank: account.openingBank === 0 ? '' : String(account.openingBank),
      active: account.active
    })

    focusAccountName()
  }

  const requestDelete = (account: Account): void => {
    setDeleteTarget(account)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.accounts.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        handleNew()
      }

      setDeleteTarget(null)
      await loadAccounts()
      showAlert('success', 'Account deleted successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = useCallback((): void => {
    if (deleting) return
    setDeleteTarget(null)
  }, [deleting])

  useEffect(() => {
    let cancelled = false

    Promise.all([window.api.accountGroups.list(), window.api.accounts.list()])
      .then(([groupData, accountData]) => {
        if (cancelled) return

        setAccountGroups(groupData)
        setAccounts(accountData)

        const firstActiveGroup = groupData.find((group) => group.active)
        if (firstActiveGroup) {
          setForm((current) => ({
            ...current,
            accountGroupId: current.accountGroupId || firstActiveGroup.id
          }))
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    focusAccountName()

    return () => {
      cancelled = true

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [focusAccountName, showAlert])

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        handleNew()
      }

      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave()
      }

      if (event.key === 'Escape') {
        if (deleteTarget) {
          handleCancelDelete()
          return
        }

        if (editingId) {
          handleNew()
        }
      }
    }

    window.addEventListener('keydown', handleKeyboard)

    return () => {
      window.removeEventListener('keydown', handleKeyboard)
    }
  }, [deleteTarget, editingId, handleCancelDelete, handleNew, handleSave])

  return (
    <div className="account-master-screen">
      <div className="account-master-window">
        <div className="form-title-bar">
          <span>Account Master</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-master-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="account-master-form-panel">
            <div className="section-title">Basic Details</div>

            <div className="account-form-grid">
              <div className="form-field">
                <label htmlFor="account-master-name">Account Name</label>
                <input
                  id="account-master-name"
                  ref={accountNameInputRef}
                  value={form.accountName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      accountName: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, otherNameInputRef.current)}
                  placeholder="Enter account name"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-other-name">Other Name</label>
                <input
                  id="account-master-other-name"
                  ref={otherNameInputRef}
                  value={form.otherName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      otherName: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, accountGroupSelectRef.current)}
                  placeholder="Optional"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-group">Account Group</label>
                <select
                  id="account-master-group"
                  ref={accountGroupSelectRef}
                  value={form.accountGroupId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      accountGroupId: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, mobileInputRef.current)}
                >
                  <option value="">Select Group</option>
                  {activeGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.groupName} - {group.groupType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="account-master-mobile">Mobile No.</label>
                <input
                  id="account-master-mobile"
                  ref={mobileInputRef}
                  value={form.mobileNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mobileNumber: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, whatsappInputRef.current)}
                  placeholder="Mobile number"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-whatsapp">WhatsApp No.</label>
                <input
                  id="account-master-whatsapp"
                  ref={whatsappInputRef}
                  value={form.whatsappNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      whatsappNumber: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, cityInputRef.current)}
                  placeholder="WhatsApp number"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-city">City</label>
                <input
                  id="account-master-city"
                  ref={cityInputRef}
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, stateInputRef.current)}
                  placeholder="City"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-state">State</label>
                <input
                  id="account-master-state"
                  ref={stateInputRef}
                  value={form.state}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      state: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, gstInputRef.current)}
                  placeholder="State"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-gst">GST No.</label>
                <input
                  id="account-master-gst"
                  ref={gstInputRef}
                  value={form.gstNo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gstNo: event.target.value.toUpperCase()
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, panInputRef.current)}
                  placeholder="GST number"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-pan">PAN No.</label>
                <input
                  id="account-master-pan"
                  ref={panInputRef}
                  value={form.panNo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      panNo: event.target.value.toUpperCase()
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, goldFineInputRef.current)}
                  placeholder="PAN number"
                />
              </div>
            </div>

            <div className="section-title">Opening Balance</div>

            <div className="balance-grid">
              <div className="form-field">
                <label htmlFor="account-master-gold-fine">Gold Fine</label>
                <input
                  id="account-master-gold-fine"
                  ref={goldFineInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.openingGoldFine}
                  onChange={(event) => {
                    const value = event.target.value

                    if (isValidAmountInput(value)) {
                      setForm((current) => ({
                        ...current,
                        openingGoldFine: value
                      }))
                    }
                  }}
                  onKeyDown={(event) => focusNextOnEnter(event, silverFineInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-silver-fine">Silver Fine</label>
                <input
                  id="account-master-silver-fine"
                  ref={silverFineInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.openingSilverFine}
                  onChange={(event) => {
                    const value = event.target.value

                    if (isValidAmountInput(value)) {
                      setForm((current) => ({
                        ...current,
                        openingSilverFine: value
                      }))
                    }
                  }}
                  onKeyDown={(event) => focusNextOnEnter(event, cashInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-cash">Cash</label>
                <input
                  id="account-master-cash"
                  ref={cashInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.openingCash}
                  onChange={(event) => {
                    const value = event.target.value

                    if (isValidAmountInput(value)) {
                      setForm((current) => ({
                        ...current,
                        openingCash: value
                      }))
                    }
                  }}
                  onKeyDown={(event) => focusNextOnEnter(event, anamatInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-anamat">Anamat</label>
                <input
                  id="account-master-anamat"
                  ref={anamatInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.openingAnamat}
                  onChange={(event) => {
                    const value = event.target.value

                    if (isValidAmountInput(value)) {
                      setForm((current) => ({
                        ...current,
                        openingAnamat: value
                      }))
                    }
                  }}
                  onKeyDown={(event) => focusNextOnEnter(event, bankInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="account-master-bank">Bank</label>
                <input
                  id="account-master-bank"
                  ref={bankInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.openingBank}
                  onChange={(event) => {
                    const value = event.target.value

                    if (isValidAmountInput(value)) {
                      setForm((current) => ({
                        ...current,
                        openingBank: value
                      }))
                    }
                  }}
                  onKeyDown={(event) => focusNextOnEnter(event, activeCheckboxRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field active-field">
                <label htmlFor="account-master-active">Active</label>
                <input
                  id="account-master-active"
                  ref={activeCheckboxRef}
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.checked
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void handleSave()
                    }
                  }}
                />
              </div>
            </div>

            <div className="button-row account-button-row">
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

          <div className="list-toolbar">
            <div className="list-search">
              <label htmlFor="account-master-search">Search</label>

              <input
                id="account-master-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search account, group, mobile, city, GST, PAN"
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

            <div className="record-summary">
              Total: <strong>{accounts.length}</strong> | Active: <strong>{activeCount}</strong> |
              Showing: <strong>{filteredAccounts.length}</strong>
            </div>
          </div>

          <div className="table-panel account-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Account Name</th>
                  <th>Group</th>
                  <th>Mobile</th>
                  <th>City</th>
                  <th>Silver Fine</th>
                  <th>Cash</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="empty-row">
                      Loading accounts...
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-row">
                      {searchText ? 'No matching account found.' : 'No account added yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((account, index) => (
                    <tr
                      key={account.id}
                      className={editingId === account.id ? 'selected-row' : ''}
                      onDoubleClick={() => handleEdit(account)}
                    >
                      <td>{index + 1}</td>
                      <td>{account.accountName}</td>
                      <td>{account.groupName}</td>
                      <td>{account.mobileNumber || '-'}</td>
                      <td>{account.city || '-'}</td>
                      <td>{account.openingSilverFine}</td>
                      <td>{account.openingCash}</td>
                      <td>
                        <span className={account.active ? 'status-active' : 'status-inactive'}>
                          {account.active ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-edit"
                          type="button"
                          onClick={() => handleEdit(account)}
                        >
                          Edit
                        </button>

                        <button
                          className="table-delete"
                          type="button"
                          onClick={() => requestDelete(account)}
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
            Tip: Double-click a row to edit. Press Enter to move through the form.
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Account?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.accountName}"? This action cannot be undone.`
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

export default AccountMasterScreen
