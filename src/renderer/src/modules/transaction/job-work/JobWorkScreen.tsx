import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import {
  calculateHishob,
  calculateFine,
  calculateMajuri,
  type LabourRateType
} from '../../../utils/jewelleryFormula'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Other'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
  groupName: string
  active: boolean
}

type Item = {
  id: string
  itemName: string
  metalType: string
  active: boolean
}

const initialHeader = {
  orderNo: '',
  orderDate: getTodayDate(),
  karigarAccountId: '',
  metalType: 'Silver' as MetalType,
  itemId: '',
  grossWeightGiven: '',
  netWeightGiven: '',
  narration: ''
}

const initialReceiptForm = {
  receiptDate: getTodayDate(),
  pcs: '',
  grossWeightReceived: '',
  netWeightReceived: '',
  tunch: '',
  wastage: '',
  labourRate: '',
  labourRateType: 'Kg' as LabourRateType,
  narration: ''
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
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function getStatusLabel(status: JobWorkStatus): string {
  if (status === 'pending') return 'Pending'
  if (status === 'partial_received') return 'Partial Received'
  if (status === 'received') return 'Received'
  return 'Cancelled'
}

function JobWorkScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [receiptForm, setReceiptForm] = useState(initialReceiptForm)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [orders, setOrders] = useState<JobWorkRegisterRecord[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobWorkRegisterRecord | null>(null)
  const [receiveTarget, setReceiveTarget] = useState<SavedJobWorkRecord | null>(null)
  const [detailRecord, setDetailRecord] = useState<SavedJobWorkRecord | null>(null)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | JobWorkStatus>('ALL')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [receiving, setReceiving] = useState(false)
  const [opening, setOpening] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const karigarSelectRef = useRef<HTMLSelectElement | null>(null)
  const itemSelectRef = useRef<HTMLSelectElement | null>(null)
  const grossWeightInputRef = useRef<HTMLInputElement | null>(null)
  const netWeightInputRef = useRef<HTMLInputElement | null>(null)

  const receiptPcsInputRef = useRef<HTMLInputElement | null>(null)
  const receiptGrossInputRef = useRef<HTMLInputElement | null>(null)
  const receiptNetInputRef = useRef<HTMLInputElement | null>(null)
  const receiptTunchInputRef = useRef<HTMLInputElement | null>(null)
  const receiptWastageInputRef = useRef<HTMLInputElement | null>(null)
  const receiptLabourRateInputRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const activeItems = useMemo(() => {
    return items.filter((item) => item.active && item.metalType === header.metalType)
  }, [items, header.metalType])

  const filteredOrders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return orders.filter((order) => {
      const statusMatch = statusFilter === 'ALL' || order.status === statusFilter
      const keywordMatch =
        !keyword ||
        order.order_no.toLowerCase().includes(keyword) ||
        order.karigar_name.toLowerCase().includes(keyword) ||
        order.karigar_mobile.toLowerCase().includes(keyword) ||
        order.item_name.toLowerCase().includes(keyword) ||
        order.metal_type.toLowerCase().includes(keyword) ||
        order.order_date.toLowerCase().includes(keyword)

      return statusMatch && keywordMatch
    })
  }, [orders, searchText, statusFilter])

  const statusCounts = useMemo(() => {
    return orders.reduce(
      (counts, order) => {
        counts.pending += order.status === 'pending' ? 1 : 0
        counts.partial += order.status === 'partial_received' ? 1 : 0
        counts.received += order.status === 'received' ? 1 : 0
        counts.cancelled += order.status === 'cancelled' ? 1 : 0
        return counts
      },
      { pending: 0, partial: 0, received: 0, cancelled: 0 }
    )
  }, [orders])

  const receiptPreview = useMemo(() => {
    const netWeight = toNumber(receiptForm.netWeightReceived)
    const pcs = toNumber(receiptForm.pcs)
    const tunch = toNumber(receiptForm.tunch)
    const wastage = toNumber(receiptForm.wastage)
    const labourRate = toNumber(receiptForm.labourRate)

    const hishob = calculateHishob(tunch, wastage)
    const fine = calculateFine(netWeight, tunch, wastage)
    const majuri = calculateMajuri({
      netWeight,
      pcs,
      labourRate,
      labourRateType: receiptForm.labourRateType
    })
    const weightLoss = receiveTarget
      ? Number(receiveTarget.header.net_weight_given || 0) - netWeight
      : 0

    return { hishob, fine, majuri, weightLoss }
  }, [receiptForm, receiveTarget])

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
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    nextElement?.focus()
  }

  const handleHeaderDecimalChange = (
    value: string,
    fieldName: 'grossWeightGiven' | 'netWeightGiven'
  ): void => {
    if (!isValidAmountInput(value)) return

    setHeader((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const handleReceiptDecimalChange = (
    value: string,
    fieldName: 'pcs' | 'grossWeightReceived' | 'netWeightReceived' | 'tunch' | 'wastage' | 'labourRate'
  ): void => {
    if (!isValidAmountInput(value)) return

    setReceiptForm((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const loadAccounts = useCallback(async (): Promise<void> => {
    const data = await window.api.accounts.list()
    setAccounts(data)
  }, [])

  const loadItems = useCallback(async (): Promise<void> => {
    const data = await window.api.items.list()
    setItems(data)
  }, [])

  const loadOrders = useCallback(async (): Promise<void> => {
    const data = await window.api.jobWork.list()
    setOrders(data)
  }, [])

  const loadNextNumber = useCallback(async (): Promise<void> => {
    const nextNumber = await window.api.jobWork.getNextNumber()
    setHeader((current) => ({ ...current, orderNo: nextNumber }))
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadItems(), loadOrders(), loadNextNumber()])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadItems, loadOrders, loadNextNumber, showAlert])

  const handleMetalChange = (metalType: MetalType): void => {
    setHeader((current) => ({ ...current, metalType, itemId: '' }))
  }

  const validateOrder = (): boolean => {
    if (!header.karigarAccountId) {
      showAlert('warning', 'Please select karigar account.')
      karigarSelectRef.current?.focus()
      return false
    }

    if (!header.itemId) {
      showAlert('warning', 'Please select item.')
      itemSelectRef.current?.focus()
      return false
    }

    if (toNumber(header.grossWeightGiven) <= 0) {
      showAlert('warning', 'Please enter gross weight given.')
      grossWeightInputRef.current?.focus()
      return false
    }

    if (toNumber(header.netWeightGiven) <= 0) {
      showAlert('warning', 'Please enter net weight given.')
      netWeightInputRef.current?.focus()
      return false
    }

    return true
  }

  const resetForm = async (): Promise<void> => {
    setEditingId(null)
    setHeader(initialHeader)
    await loadNextNumber()
  }

  const buildPayload = (): JobWorkOrderPayload => {
    return {
      orderDate: header.orderDate,
      karigarAccountId: header.karigarAccountId,
      metalType: header.metalType,
      itemId: header.itemId,
      grossWeightGiven: toNumber(header.grossWeightGiven),
      netWeightGiven: toNumber(header.netWeightGiven),
      narration: header.narration
    }
  }

  const handleSaveOrder = async (): Promise<void> => {
    if (!validateOrder()) return

    try {
      setSaving(true)

      const payload = buildPayload()

      if (editingId) {
        await window.api.jobWork.update(editingId, payload)
      } else {
        await window.api.jobWork.create(payload)
      }

      showAlert(
        'success',
        editingId ? 'Job work order updated successfully.' : 'Job work order saved successfully.'
      )
      await resetForm()
      await loadOrders()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditOrder = async (order: JobWorkRegisterRecord): Promise<void> => {
    if (order.status !== 'pending') {
      showAlert('warning', 'Only a pending job work order can be edited.')
      return
    }

    try {
      setOpening(true)
      const record = await window.api.jobWork.getById(order.id)

      setEditingId(record.header.id)
      setHeader({
        orderNo: record.header.order_no,
        orderDate: record.header.order_date,
        karigarAccountId: record.header.karigar_account_id,
        metalType: record.header.metal_type as MetalType,
        itemId: record.header.item_id,
        grossWeightGiven:
          record.header.gross_weight_given === 0 ? '' : String(record.header.gross_weight_given),
        netWeightGiven:
          record.header.net_weight_given === 0 ? '' : String(record.header.net_weight_given),
        narration: record.header.narration
      })

      showAlert('success', `Editing job work order ${record.header.order_no}.`)
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
      const result = await window.api.jobWork.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        await resetForm()
      }

      setDeleteTarget(null)
      await loadOrders()
      showAlert('success', `Job work order ${result.orderNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenDetail = async (order: JobWorkRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const record = await window.api.jobWork.getById(order.id)
      setDetailRecord(record)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleOpenReceive = async (order: JobWorkRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const record = await window.api.jobWork.getById(order.id)
      setReceiveTarget(record)
      setReceiptForm(initialReceiptForm)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const validateReceipt = (): boolean => {
    if (toNumber(receiptForm.pcs) <= 0) {
      showAlert('warning', 'Please enter pcs received.')
      receiptPcsInputRef.current?.focus()
      return false
    }

    if (toNumber(receiptForm.grossWeightReceived) <= 0) {
      showAlert('warning', 'Please enter gross weight received.')
      receiptGrossInputRef.current?.focus()
      return false
    }

    if (toNumber(receiptForm.netWeightReceived) <= 0) {
      showAlert('warning', 'Please enter net weight received.')
      receiptNetInputRef.current?.focus()
      return false
    }

    return true
  }

  const handleSaveReceipt = async (): Promise<void> => {
    if (!receiveTarget) return
    if (!validateReceipt()) return

    try {
      setReceiving(true)

      const payload: JobWorkReceiptPayload = {
        receiptDate: receiptForm.receiptDate,
        pcs: toNumber(receiptForm.pcs),
        grossWeightReceived: toNumber(receiptForm.grossWeightReceived),
        netWeightReceived: toNumber(receiptForm.netWeightReceived),
        tunch: toNumber(receiptForm.tunch),
        wastage: toNumber(receiptForm.wastage),
        labourRate: toNumber(receiptForm.labourRate),
        labourRateType: receiptForm.labourRateType,
        narration: receiptForm.narration
      }

      const updated = await window.api.jobWork.receiveGoods(receiveTarget.header.id, payload)

      setReceiveTarget(updated)
      setReceiptForm(initialReceiptForm)
      await loadOrders()
      showAlert('success', `Receipt recorded against job work order ${updated.header.order_no}.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setReceiving(false)
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
          <span>Job Work (Karigar Out / Receipt)</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="approval-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="approval-panel">
            <div className="section-title">
              {editingId ? `Edit Job Work Order ${header.orderNo}` : 'Job Work Order (Material Out)'}
            </div>

            <div className="approval-header-grid job-work-header-grid">
              <div className="form-field">
                <label>Order No.</label>
                <input value={header.orderNo} disabled />
              </div>

              <div className="form-field">
                <label>Date</label>
                <input
                  type="date"
                  value={header.orderDate}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, orderDate: event.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <label>Karigar</label>
                <select
                  ref={karigarSelectRef}
                  value={header.karigarAccountId}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, karigarAccountId: event.target.value }))
                  }
                >
                  <option value="">Select Karigar</option>
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Gold / Silver</label>
                <select
                  value={header.metalType}
                  onChange={(event) => handleMetalChange(event.target.value as MetalType)}
                >
                  <option>Gold</option>
                  <option>Silver</option>
                  <option>Diamond</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="form-field">
                <label>Item</label>
                <select
                  ref={itemSelectRef}
                  value={header.itemId}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, itemId: event.target.value }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, grossWeightInputRef.current)}
                >
                  <option value="">Select Item</option>
                  {activeItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Gr. Wt. Given</label>
                <input
                  ref={grossWeightInputRef}
                  value={header.grossWeightGiven}
                  onChange={(event) => handleHeaderDecimalChange(event.target.value, 'grossWeightGiven')}
                  onKeyDown={(event) => focusNextOnEnter(event, netWeightInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Net Wt. Given</label>
                <input
                  ref={netWeightInputRef}
                  value={header.netWeightGiven}
                  onChange={(event) => handleHeaderDecimalChange(event.target.value, 'netWeightGiven')}
                  placeholder="0"
                />
              </div>

              <div className="form-field job-work-narration-field">
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
              <button
                className="btn-save"
                onClick={() => void handleSaveOrder()}
                disabled={saving}
              >
                {saving ? 'Saving...' : editingId ? 'Update Order' : 'Save Order'}
              </button>

              <button className="btn-new" onClick={() => void resetForm()} disabled={saving}>
                New
              </button>
            </div>
          </div>

          <div className="approval-list-panel">
            <div className="section-title">Job Work Orders</div>

            <div className="approval-toolbar">
              <div className="form-field">
                <label htmlFor="job-work-status-filter">Status</label>
                <select
                  id="job-work-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'ALL' | JobWorkStatus)}
                >
                  <option value="ALL">All</option>
                  <option value="pending">Pending</option>
                  <option value="partial_received">Partial Received</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="list-search">
                <label htmlFor="job-work-search">Search</label>
                <input
                  id="job-work-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search order no, karigar, item, date"
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
                onClick={() => void loadOrders()}
                disabled={loading}
              >
                Refresh
              </button>

              <div className="record-summary">
                Total: <strong>{orders.length}</strong> | Pending:{' '}
                <strong>{statusCounts.pending}</strong> | Partial:{' '}
                <strong>{statusCounts.partial}</strong> | Received:{' '}
                <strong>{statusCounts.received}</strong>
              </div>
            </div>

            <div className="table-panel approval-table-panel">
              <table>
                <thead>
                  <tr>
                    <th>Sr</th>
                    <th>Order No</th>
                    <th>Date</th>
                    <th>Karigar</th>
                    <th>Item</th>
                    <th>Metal</th>
                    <th>Gr. Wt. Given</th>
                    <th>Net Wt. Given</th>
                    <th>Net Wt. Received</th>
                    <th>Majuri</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="empty-row">
                        Loading job work orders...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="empty-row">
                        {searchText || statusFilter !== 'ALL'
                          ? 'No matching job work order found.'
                          : 'No job work order saved yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, index) => (
                      <tr key={order.id}>
                        <td>{index + 1}</td>
                        <td>{order.order_no}</td>
                        <td>{formatDate(order.order_date)}</td>
                        <td>{order.karigar_name}</td>
                        <td>{order.item_name}</td>
                        <td>{order.metal_type}</td>
                        <td>{formatNumber(order.gross_weight_given)}</td>
                        <td>{formatNumber(order.net_weight_given)}</td>
                        <td>{formatNumber(order.total_net_weight_received)}</td>
                        <td>{formatNumber(order.total_majuri)}</td>
                        <td>
                          <span className={`approval-badge ${order.status}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td>
                          <div className="sale-register-actions approval-actions">
                            <button
                              className="table-edit"
                              type="button"
                              onClick={() => void handleOpenDetail(order)}
                              disabled={opening}
                            >
                              View
                            </button>

                            {order.status === 'pending' && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => void handleEditOrder(order)}
                                disabled={opening || saving}
                              >
                                Edit
                              </button>
                            )}

                            {(order.status === 'pending' || order.status === 'partial_received') && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => void handleOpenReceive(order)}
                                disabled={opening}
                              >
                                Receive Goods
                              </button>
                            )}

                            {order.status === 'pending' && (
                              <button
                                className="table-delete"
                                type="button"
                                onClick={() => setDeleteTarget(order)}
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
              Job Work Out leaves no stock or account effect - material sent to the karigar is only
              tracked here. Stock increases and majuri is posted to the karigar&apos;s account only
              when goods are received back.
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Job Work Order?"
        message={
          deleteTarget
            ? `Are you sure you want to delete job work order "${deleteTarget.order_no}" for "${deleteTarget.karigar_name}"?`
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

      {detailRecord && (
        <div className="print-preview-overlay">
          <div className="approval-detail-dialog">
            <div className="form-title-bar">
              <span>
                Job Work {detailRecord.header.order_no} -{' '}
                {getStatusLabel(detailRecord.header.status)}
              </span>

              <button
                className="module-close-btn"
                type="button"
                onClick={() => setDetailRecord(null)}
              >
                &times;
              </button>
            </div>

            <div className="approval-detail-body">
              <div className="approval-detail-meta">
                <div>
                  <span>Karigar</span>
                  <strong>{detailRecord.header.karigar_name}</strong>
                </div>
                <div>
                  <span>Item</span>
                  <strong>{detailRecord.header.item_name}</strong>
                </div>
                <div>
                  <span>Gr. Wt. Given</span>
                  <strong>{formatNumber(detailRecord.header.gross_weight_given)}</strong>
                </div>
                <div>
                  <span>Net Wt. Given</span>
                  <strong>{formatNumber(detailRecord.header.net_weight_given)}</strong>
                </div>
              </div>

              <div className="table-panel approval-detail-table-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Sr</th>
                      <th>Date</th>
                      <th>Pcs</th>
                      <th>Gr. Wt.</th>
                      <th>Net Wt.</th>
                      <th>Tunch</th>
                      <th>Wstg</th>
                      <th>Fine</th>
                      <th>Wt. Loss</th>
                      <th>Majuri</th>
                    </tr>
                  </thead>

                  <tbody>
                    {detailRecord.receiptLines.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="empty-row">
                          No receipt recorded yet.
                        </td>
                      </tr>
                    ) : (
                      detailRecord.receiptLines.map((line, index) => (
                        <tr key={line.id}>
                          <td>{index + 1}</td>
                          <td>{formatDate(line.receipt_date)}</td>
                          <td>{formatNumber(line.pcs)}</td>
                          <td>{formatNumber(line.gross_weight_received)}</td>
                          <td>{formatNumber(line.net_weight_received)}</td>
                          <td>{formatNumber(line.tunch)}</td>
                          <td>{formatNumber(line.wastage)}</td>
                          <td>{formatNumber(line.fine_received)}</td>
                          <td>{formatNumber(line.weight_loss)}</td>
                          <td>{formatNumber(line.majuri)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {receiveTarget && (
        <div className="print-preview-overlay">
          <div className="approval-detail-dialog job-work-receive-dialog">
            <div className="form-title-bar">
              <span>Receive Goods - Job Work {receiveTarget.header.order_no}</span>

              <button
                className="module-close-btn"
                type="button"
                onClick={() => setReceiveTarget(null)}
              >
                &times;
              </button>
            </div>

            <div className="approval-detail-body">
              <div className="approval-detail-meta">
                <div>
                  <span>Karigar</span>
                  <strong>{receiveTarget.header.karigar_name}</strong>
                </div>
                <div>
                  <span>Item</span>
                  <strong>{receiveTarget.header.item_name}</strong>
                </div>
                <div>
                  <span>Net Wt. Given</span>
                  <strong>{formatNumber(receiveTarget.header.net_weight_given)}</strong>
                </div>
                <div>
                  <span>Net Wt. Received So Far</span>
                  <strong>{formatNumber(receiveTarget.header.total_net_weight_received)}</strong>
                </div>
              </div>

              <div className="approval-item-entry-grid job-work-receipt-grid">
                <div className="form-field">
                  <label>Receipt Date</label>
                  <input
                    type="date"
                    value={receiptForm.receiptDate}
                    onChange={(event) =>
                      setReceiptForm((current) => ({ ...current, receiptDate: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Pcs</label>
                  <input
                    ref={receiptPcsInputRef}
                    value={receiptForm.pcs}
                    onChange={(event) => handleReceiptDecimalChange(event.target.value, 'pcs')}
                    onKeyDown={(event) => focusNextOnEnter(event, receiptGrossInputRef.current)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>Gr. Wt.</label>
                  <input
                    ref={receiptGrossInputRef}
                    value={receiptForm.grossWeightReceived}
                    onChange={(event) =>
                      handleReceiptDecimalChange(event.target.value, 'grossWeightReceived')
                    }
                    onKeyDown={(event) => focusNextOnEnter(event, receiptNetInputRef.current)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>Net Wt.</label>
                  <input
                    ref={receiptNetInputRef}
                    value={receiptForm.netWeightReceived}
                    onChange={(event) =>
                      handleReceiptDecimalChange(event.target.value, 'netWeightReceived')
                    }
                    onKeyDown={(event) => focusNextOnEnter(event, receiptTunchInputRef.current)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>Tunch</label>
                  <input
                    ref={receiptTunchInputRef}
                    value={receiptForm.tunch}
                    onChange={(event) => handleReceiptDecimalChange(event.target.value, 'tunch')}
                    onKeyDown={(event) => focusNextOnEnter(event, receiptWastageInputRef.current)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>Wstg</label>
                  <input
                    ref={receiptWastageInputRef}
                    value={receiptForm.wastage}
                    onChange={(event) => handleReceiptDecimalChange(event.target.value, 'wastage')}
                    onKeyDown={(event) => focusNextOnEnter(event, receiptLabourRateInputRef.current)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field readonly-field">
                  <label>Hishob</label>
                  <input value={formatNumber(receiptPreview.hishob)} disabled />
                </div>

                <div className="form-field">
                  <label>Majuri Rate</label>
                  <input
                    ref={receiptLabourRateInputRef}
                    value={receiptForm.labourRate}
                    onChange={(event) => handleReceiptDecimalChange(event.target.value, 'labourRate')}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>Unit</label>
                  <select
                    value={receiptForm.labourRateType}
                    onChange={(event) =>
                      setReceiptForm((current) => ({
                        ...current,
                        labourRateType: event.target.value as LabourRateType
                      }))
                    }
                  >
                    <option value="Kg">Kg</option>
                    <option value="Gm">Gm</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>

                <div className="form-field readonly-field">
                  <label>Fine</label>
                  <input value={formatNumber(receiptPreview.fine)} disabled />
                </div>

                <div className="form-field readonly-field">
                  <label>Wt. Loss</label>
                  <input value={formatNumber(receiptPreview.weightLoss)} disabled />
                </div>

                <div className="form-field readonly-field">
                  <label>Majuri</label>
                  <input value={formatNumber(receiptPreview.majuri)} disabled />
                </div>

                <div className="form-field job-work-narration-field">
                  <label>Narration</label>
                  <input
                    value={receiptForm.narration}
                    onChange={(event) =>
                      setReceiptForm((current) => ({ ...current, narration: event.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="button-row approval-detail-button-row">
                <button
                  className="btn-save"
                  type="button"
                  onClick={() => void handleSaveReceipt()}
                  disabled={receiving}
                >
                  {receiving ? 'Saving...' : 'Save Receipt'}
                </button>
              </div>

              {receiveTarget.receiptLines.length > 0 && (
                <div className="table-panel approval-detail-table-panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Sr</th>
                        <th>Date</th>
                        <th>Pcs</th>
                        <th>Net Wt.</th>
                        <th>Fine</th>
                        <th>Majuri</th>
                      </tr>
                    </thead>

                    <tbody>
                      {receiveTarget.receiptLines.map((line, index) => (
                        <tr key={line.id}>
                          <td>{index + 1}</td>
                          <td>{formatDate(line.receipt_date)}</td>
                          <td>{formatNumber(line.pcs)}</td>
                          <td>{formatNumber(line.net_weight_received)}</td>
                          <td>{formatNumber(line.fine_received)}</td>
                          <td>{formatNumber(line.majuri)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobWorkScreen
