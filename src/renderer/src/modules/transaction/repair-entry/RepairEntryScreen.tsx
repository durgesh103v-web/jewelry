import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Other'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
  groupName: string
  active: boolean
}

const initialHeader = {
  repairNo: '',
  receiptDate: getTodayDate(),
  accountId: '',
  phone: '',
  itemDescription: '',
  metalType: 'Silver' as MetalType,
  approxWeight: '',
  workDescription: '',
  estimatedCharge: '',
  narration: ''
}

const initialCompleteForm = {
  actualCharge: '',
  completedDate: getTodayDate(),
  narration: ''
}

const initialDeliverForm = {
  deliveredDate: getTodayDate()
}

function getTodayDate(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
    .toFixed(2)
    .replace(/\.?0+$/, '')
}

function formatDate(value: string | null): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function getStatusLabel(status: RepairEntryStatus): string {
  if (status === 'received') return 'Received'
  if (status === 'completed') return 'Completed'
  if (status === 'delivered') return 'Delivered'
  return 'Cancelled'
}

function RepairEntryScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [completeForm, setCompleteForm] = useState(initialCompleteForm)
  const [deliverForm, setDeliverForm] = useState(initialDeliverForm)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<RepairEntryRecord[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RepairEntryRecord | null>(null)
  const [completeTarget, setCompleteTarget] = useState<RepairEntryRecord | null>(null)
  const [deliverTarget, setDeliverTarget] = useState<RepairEntryRecord | null>(null)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | RepairEntryStatus>('ALL')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [opening, setOpening] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const accountSelectRef = useRef<HTMLSelectElement | null>(null)
  const itemDescriptionInputRef = useRef<HTMLInputElement | null>(null)
  const actualChargeInputRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const filteredEntries = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return entries.filter((entry) => {
      const statusMatch = statusFilter === 'ALL' || entry.status === statusFilter
      const keywordMatch =
        !keyword ||
        entry.repair_no.toLowerCase().includes(keyword) ||
        entry.account_name.toLowerCase().includes(keyword) ||
        entry.mobile_number.toLowerCase().includes(keyword) ||
        entry.item_description.toLowerCase().includes(keyword) ||
        entry.metal_type.toLowerCase().includes(keyword) ||
        entry.receipt_date.toLowerCase().includes(keyword)

      return statusMatch && keywordMatch
    })
  }, [entries, searchText, statusFilter])

  const statusCounts = useMemo(() => {
    return entries.reduce(
      (counts, entry) => {
        counts.received += entry.status === 'received' ? 1 : 0
        counts.completed += entry.status === 'completed' ? 1 : 0
        counts.delivered += entry.status === 'delivered' ? 1 : 0
        counts.cancelled += entry.status === 'cancelled' ? 1 : 0
        return counts
      },
      { received: 0, completed: 0, delivered: 0, cancelled: 0 }
    )
  }, [entries])

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

  const handleHeaderDecimalChange = (
    value: string,
    fieldName: 'approxWeight' | 'estimatedCharge'
  ): void => {
    if (!isValidAmountInput(value)) return

    setHeader((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const loadAccounts = useCallback(async (): Promise<void> => {
    const data = await window.api.accounts.list()
    setAccounts(data)
  }, [])

  const loadEntries = useCallback(async (): Promise<void> => {
    const data = await window.api.repairEntry.list()
    setEntries(data)
  }, [])

  const loadNextNumber = useCallback(async (): Promise<void> => {
    const nextNumber = await window.api.repairEntry.getNextNumber()
    setHeader((current) => ({ ...current, repairNo: nextNumber }))
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadEntries(), loadNextNumber()])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadEntries, loadNextNumber, showAlert])

  const handleAccountChange = (accountId: string): void => {
    const account = accounts.find((currentAccount) => currentAccount.id === accountId)

    setHeader((current) => ({
      ...current,
      accountId,
      phone: account?.mobileNumber ?? ''
    }))
  }

  const validateEntry = (): boolean => {
    if (!header.accountId) {
      showAlert('warning', 'Please select customer account.')
      accountSelectRef.current?.focus()
      return false
    }

    if (!header.itemDescription.trim()) {
      showAlert('warning', 'Please enter item description.')
      itemDescriptionInputRef.current?.focus()
      return false
    }

    return true
  }

  const resetForm = async (): Promise<void> => {
    setEditingId(null)
    setHeader(initialHeader)
    await loadNextNumber()
  }

  const buildPayload = (): RepairEntryPayload => {
    return {
      receiptDate: header.receiptDate,
      accountId: header.accountId,
      phone: header.phone,
      itemDescription: header.itemDescription,
      metalType: header.metalType,
      approxWeight: toNumber(header.approxWeight),
      workDescription: header.workDescription,
      estimatedCharge: toNumber(header.estimatedCharge),
      narration: header.narration
    }
  }

  const handleSaveEntry = async (): Promise<void> => {
    if (!validateEntry()) return

    try {
      setSaving(true)

      const payload = buildPayload()

      if (editingId) {
        await window.api.repairEntry.update(editingId, payload)
      } else {
        await window.api.repairEntry.create(payload)
      }

      showAlert(
        'success',
        editingId ? 'Repair entry updated successfully.' : 'Repair entry saved successfully.'
      )
      await resetForm()
      await loadEntries()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditEntry = async (entry: RepairEntryRecord): Promise<void> => {
    if (entry.status !== 'received') {
      showAlert('warning', 'Only a repair entry with status Received can be edited.')
      return
    }

    try {
      setOpening(true)
      const record = await window.api.repairEntry.getById(entry.id)

      setEditingId(record.id)
      setHeader({
        repairNo: record.repair_no,
        receiptDate: record.receipt_date,
        accountId: record.account_id,
        phone: record.phone,
        itemDescription: record.item_description,
        metalType: record.metal_type as MetalType,
        approxWeight: record.approx_weight === 0 ? '' : String(record.approx_weight),
        workDescription: record.work_description,
        estimatedCharge: record.estimated_charge === 0 ? '' : String(record.estimated_charge),
        narration: record.narration
      })

      showAlert('success', `Editing repair entry ${record.repair_no}.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      const result = await window.api.repairEntry.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        await resetForm()
      }

      setDeleteTarget(null)
      await loadEntries()
      showAlert('success', `Repair entry ${result.repairNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenComplete = (entry: RepairEntryRecord): void => {
    setCompleteTarget(entry)
    setCompleteForm({
      actualCharge: entry.estimated_charge === 0 ? '' : String(entry.estimated_charge),
      completedDate: getTodayDate(),
      narration: ''
    })
  }

  const handleSaveComplete = async (): Promise<void> => {
    if (!completeTarget) return

    if (toNumber(completeForm.actualCharge) < 0) {
      showAlert('warning', 'Please enter a valid actual charge.')
      actualChargeInputRef.current?.focus()
      return
    }

    try {
      setCompleting(true)

      await window.api.repairEntry.completeRepair(completeTarget.id, {
        actualCharge: toNumber(completeForm.actualCharge),
        completedDate: completeForm.completedDate,
        narration: completeForm.narration
      })

      setCompleteTarget(null)
      await loadEntries()
      showAlert('success', `Repair entry ${completeTarget.repair_no} marked completed.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setCompleting(false)
    }
  }

  const handleOpenDeliver = (entry: RepairEntryRecord): void => {
    setDeliverTarget(entry)
    setDeliverForm({ deliveredDate: getTodayDate() })
  }

  const handleSaveDeliver = async (): Promise<void> => {
    if (!deliverTarget) return

    try {
      setDelivering(true)

      await window.api.repairEntry.markDelivered(deliverTarget.id, {
        deliveredDate: deliverForm.deliveredDate
      })

      setDeliverTarget(null)
      await loadEntries()
      showAlert('success', `Repair entry ${deliverTarget.repair_no} marked delivered.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDelivering(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadInitialData()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadInitialData])

  return (
    <div className="approval-screen job-work-screen">
      <div className="approval-window">
        <div className="form-title-bar">
          <span>Repair Entry (Customer Item Repair)</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="approval-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="approval-panel">
            <div className="section-title">
              {editingId ? `Edit Repair Entry ${header.repairNo}` : 'Repair Entry (Item Received)'}
            </div>

            <div className="approval-header-grid repair-entry-header-grid">
              <div className="form-field">
                <label>Repair No.</label>
                <input value={header.repairNo} disabled />
              </div>

              <div className="form-field">
                <label>Date</label>
                <input
                  type="date"
                  value={header.receiptDate}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, receiptDate: event.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <label>Customer</label>
                <select
                  ref={accountSelectRef}
                  value={header.accountId}
                  onChange={(event) => handleAccountChange(event.target.value)}
                >
                  <option value="">Select Customer</option>
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Phone</label>
                <input
                  value={header.phone}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <label>Gold / Silver</label>
                <select
                  value={header.metalType}
                  onChange={(event) =>
                    setHeader((current) => ({
                      ...current,
                      metalType: event.target.value as MetalType
                    }))
                  }
                >
                  <option>Gold</option>
                  <option>Silver</option>
                  <option>Diamond</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="form-field">
                <label>Item Description</label>
                <input
                  ref={itemDescriptionInputRef}
                  value={header.itemDescription}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, itemDescription: event.target.value }))
                  }
                  placeholder="e.g. Gold Ring with stone"
                />
              </div>

              <div className="form-field">
                <label>Work Description</label>
                <input
                  value={header.workDescription}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, workDescription: event.target.value }))
                  }
                  placeholder="e.g. Resizing, polishing"
                />
              </div>

              <div className="form-field">
                <label>Approx. Weight</label>
                <input
                  value={header.approxWeight}
                  onChange={(event) => handleHeaderDecimalChange(event.target.value, 'approxWeight')}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Estimated Charge</label>
                <input
                  value={header.estimatedCharge}
                  onChange={(event) =>
                    handleHeaderDecimalChange(event.target.value, 'estimatedCharge')
                  }
                  placeholder="0"
                />
              </div>

              <div className="form-field repair-entry-narration-field">
                <label>Narration</label>
                <input
                  value={header.narration}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, narration: event.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="button-row approval-item-button-row">
              <button className="btn-save" onClick={() => void handleSaveEntry()} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Save Entry'}
              </button>

              <button className="btn-new" onClick={() => void resetForm()} disabled={saving}>
                New
              </button>
            </div>
          </div>

          <div className="approval-list-panel">
            <div className="section-title">Repair Entries</div>

            <div className="approval-toolbar">
              <div className="form-field">
                <label htmlFor="repair-entry-status-filter">Status</label>
                <select
                  id="repair-entry-status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as 'ALL' | RepairEntryStatus)
                  }
                >
                  <option value="ALL">All</option>
                  <option value="received">Received</option>
                  <option value="completed">Completed</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="list-search">
                <label htmlFor="repair-entry-search">Search</label>
                <input
                  id="repair-entry-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search repair no, customer, item, date"
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
                onClick={() => void loadEntries()}
                disabled={loading}
              >
                Refresh
              </button>

              <div className="record-summary">
                Total: <strong>{entries.length}</strong> | Received:{' '}
                <strong>{statusCounts.received}</strong> | Completed:{' '}
                <strong>{statusCounts.completed}</strong> | Delivered:{' '}
                <strong>{statusCounts.delivered}</strong>
              </div>
            </div>

            <div className="table-panel approval-table-panel">
              <table>
                <thead>
                  <tr>
                    <th>Sr</th>
                    <th>Repair No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Item</th>
                    <th>Metal</th>
                    <th>Est. Charge</th>
                    <th>Actual Charge</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="empty-row">
                        Loading repair entries...
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="empty-row">
                        {searchText || statusFilter !== 'ALL'
                          ? 'No matching repair entry found.'
                          : 'No repair entry saved yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry, index) => (
                      <tr key={entry.id}>
                        <td>{index + 1}</td>
                        <td>{entry.repair_no}</td>
                        <td>{formatDate(entry.receipt_date)}</td>
                        <td>{entry.account_name}</td>
                        <td>{entry.item_description}</td>
                        <td>{entry.metal_type}</td>
                        <td>{formatNumber(entry.estimated_charge)}</td>
                        <td>{entry.actual_charge === null ? '-' : formatNumber(entry.actual_charge)}</td>
                        <td>
                          <span className={`approval-badge ${entry.status}`}>
                            {getStatusLabel(entry.status)}
                          </span>
                        </td>
                        <td>
                          <div className="sale-register-actions approval-actions">
                            {entry.status === 'received' && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => void handleEditEntry(entry)}
                                disabled={opening || saving}
                              >
                                Edit
                              </button>
                            )}

                            {entry.status === 'received' && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => handleOpenComplete(entry)}
                                disabled={opening}
                              >
                                Complete Repair
                              </button>
                            )}

                            {entry.status === 'completed' && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => handleOpenDeliver(entry)}
                                disabled={opening}
                              >
                                Mark Delivered
                              </button>
                            )}

                            {entry.status === 'received' && (
                              <button
                                className="table-delete"
                                type="button"
                                onClick={() => setDeleteTarget(entry)}
                                disabled={deleting}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="screen-help-text">
              Repair Entry only tracks the customer&apos;s own item while it is with the firm - it is
              never added to stock. The repair charge is posted to the customer&apos;s account only
              when the repair is marked Completed.
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Repair Entry?"
        message={
          deleteTarget
            ? `Are you sure you want to delete repair entry "${deleteTarget.repair_no}" for "${deleteTarget.account_name}"?`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
      />

      {completeTarget && (
        <div className="print-preview-overlay">
          <div className="approval-detail-dialog repair-entry-complete-dialog">
            <div className="form-title-bar">
              <span>Complete Repair - {completeTarget.repair_no}</span>

              <button
                className="module-close-btn"
                type="button"
                onClick={() => setCompleteTarget(null)}
              >
                &times;
              </button>
            </div>

            <div className="approval-detail-body">
              <div className="approval-detail-meta">
                <div>
                  <span>Customer</span>
                  <strong>{completeTarget.account_name}</strong>
                </div>
                <div>
                  <span>Item</span>
                  <strong>{completeTarget.item_description}</strong>
                </div>
                <div>
                  <span>Estimated Charge</span>
                  <strong>{formatNumber(completeTarget.estimated_charge)}</strong>
                </div>
              </div>

              <div className="approval-item-entry-grid">
                <div className="form-field">
                  <label>Completed Date</label>
                  <input
                    type="date"
                    value={completeForm.completedDate}
                    onChange={(event) =>
                      setCompleteForm((current) => ({
                        ...current,
                        completedDate: event.target.value
                      }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Actual Charge</label>
                  <input
                    ref={actualChargeInputRef}
                    value={completeForm.actualCharge}
                    onChange={(event) => {
                      if (!isValidAmountInput(event.target.value)) return
                      setCompleteForm((current) => ({
                        ...current,
                        actualCharge: event.target.value
                      }))
                    }}
                    placeholder="0"
                  />
                </div>

                <div className="form-field repair-entry-narration-field">
                  <label>Narration</label>
                  <input
                    value={completeForm.narration}
                    onChange={(event) =>
                      setCompleteForm((current) => ({ ...current, narration: event.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="button-row approval-detail-button-row">
                <button
                  className="btn-save"
                  type="button"
                  onClick={() => void handleSaveComplete()}
                  disabled={completing}
                >
                  {completing ? 'Saving...' : 'Save & Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deliverTarget && (
        <div className="print-preview-overlay">
          <div className="approval-detail-dialog repair-entry-complete-dialog">
            <div className="form-title-bar">
              <span>Mark Delivered - {deliverTarget.repair_no}</span>

              <button
                className="module-close-btn"
                type="button"
                onClick={() => setDeliverTarget(null)}
              >
                &times;
              </button>
            </div>

            <div className="approval-detail-body">
              <div className="approval-detail-meta">
                <div>
                  <span>Customer</span>
                  <strong>{deliverTarget.account_name}</strong>
                </div>
                <div>
                  <span>Item</span>
                  <strong>{deliverTarget.item_description}</strong>
                </div>
                <div>
                  <span>Actual Charge</span>
                  <strong>
                    {deliverTarget.actual_charge === null
                      ? '-'
                      : formatNumber(deliverTarget.actual_charge)}
                  </strong>
                </div>
              </div>

              <div className="approval-item-entry-grid">
                <div className="form-field">
                  <label>Delivered Date</label>
                  <input
                    type="date"
                    value={deliverForm.deliveredDate}
                    onChange={(event) =>
                      setDeliverForm({ deliveredDate: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="button-row approval-detail-button-row">
                <button
                  className="btn-save"
                  type="button"
                  onClick={() => void handleSaveDeliver()}
                  disabled={delivering}
                >
                  {delivering ? 'Saving...' : 'Save & Deliver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RepairEntryScreen
