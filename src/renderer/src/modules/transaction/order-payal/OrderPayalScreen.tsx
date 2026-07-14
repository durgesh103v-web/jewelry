import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type OrderPayalForm = {
  orderDate: string
  accountId: string
  itemId: string
  pcs: string
  weight: string
  deliveryDate: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function createInitialForm(): OrderPayalForm {
  return {
    orderDate: today,
    accountId: '',
    itemId: '',
    pcs: '',
    weight: '',
    deliveryDate: '',
    narration: ''
  }
}

function formatWeight(value: number): string {
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

function statusBadgeClass(status: string): string {
  if (status === 'DELIVERED') return 'approval-badge delivered'
  if (status === 'CANCELLED') return 'approval-badge cancelled'
  return 'approval-badge pending'
}

function OrderPayalScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState<OrderPayalForm>(() => createInitialForm())
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [items, setItems] = useState<ItemRecord[]>([])
  const [orders, setOrders] = useState<OrderPayalRecord[]>([])
  const [orderNo, setOrderNo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deliverTarget, setDeliverTarget] = useState<OrderPayalRecord | null>(null)
  const [delivering, setDelivering] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<OrderPayalRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const accountInputRef = useRef<HTMLSelectElement | null>(null)
  const itemInputRef = useRef<HTMLSelectElement | null>(null)

  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])
  const activeItems = useMemo(() => items.filter((item) => item.active), [items])

  const filteredOrders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return orders

    return orders.filter((order) => {
      return (
        order.orderNo.toLowerCase().includes(keyword) ||
        order.accountName.toLowerCase().includes(keyword) ||
        order.itemName.toLowerCase().includes(keyword) ||
        order.narration.toLowerCase().includes(keyword) ||
        order.orderDate.toLowerCase().includes(keyword)
      )
    })
  }, [searchText, orders])

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
      const nextNumber = await window.api.orderPayal.getNextNumber()
      setOrderNo(nextNumber)
    } catch {
      setOrderNo('OP-0001')
    }
  }, [])

  const loadOrders = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.orderPayal.list()
      setOrders(data)
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

  const loadItems = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.items.list()
      setItems(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }, [showAlert])

  const loadScreenData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadItems(), loadOrders(), loadNextNumber()])
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadItems, loadOrders, loadNextNumber])

  const handleNew = useCallback((): void => {
    setForm(createInitialForm())
    setAlertMessage('')
    void loadNextNumber()

    window.setTimeout(() => {
      dateInputRef.current?.focus()
    }, 0)
  }, [loadNextNumber])

  const validateForm = (): boolean => {
    if (!form.orderDate) {
      showAlert('warning', 'Please select order date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.accountId) {
      showAlert('warning', 'Please select account.')
      accountInputRef.current?.focus()
      return false
    }

    if (!form.itemId) {
      showAlert('warning', 'Please select item.')
      itemInputRef.current?.focus()
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      await window.api.orderPayal.create({
        orderDate: form.orderDate,
        accountId: form.accountId,
        itemId: form.itemId,
        pcs: Number(form.pcs || 0),
        weight: Number(form.weight || 0),
        deliveryDate: form.deliveryDate,
        narration: form.narration.trim()
      })

      await loadOrders()
      handleNew()
      showAlert('success', 'Order saved successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDeliver = async (): Promise<void> => {
    if (!deliverTarget) return

    try {
      setDelivering(true)
      await window.api.orderPayal.markDelivered(deliverTarget.id)
      setDeliverTarget(null)
      await loadOrders()
      showAlert('success', 'Order marked as delivered.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDelivering(false)
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.orderPayal.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadOrders()
      showAlert('success', 'Order deleted successfully.')
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
    <div className="cash-voucher-screen order-payal-screen">
      <div className="cash-voucher-window">
        <div className="form-title-bar">
          <span>Order Payal</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="cash-voucher-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="cash-voucher-layout">
            <div className="cash-voucher-form-panel">
              <div className="cash-voucher-no-box">
                <span>Order No.</span>
                <strong>{orderNo || '-'}</strong>
              </div>

              <div className="cash-voucher-form-grid">
                <div className="form-field">
                  <label>Order Date</label>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={form.orderDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, orderDate: event.target.value }))
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
                  <label>Item</label>
                  <select
                    ref={itemInputRef}
                    value={form.itemId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, itemId: event.target.value }))
                    }
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
                  <label>Pcs</label>
                  <input
                    value={form.pcs}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, pcs: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Weight</label>
                  <input
                    value={form.weight}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, weight: event.target.value }))
                    }
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
                  {saving ? 'Saving...' : 'Save Order'}
                </button>
                <button className="btn-new" type="button" onClick={handleNew} disabled={saving}>
                  New
                </button>
              </div>
            </div>

            <div className="cash-voucher-list-panel">
              <div className="list-search">
                <label htmlFor="order-payal-search">Search</label>
                <input
                  id="order-payal-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search order no, account, item, narration"
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
                      <th>Order No</th>
                      <th>Account</th>
                      <th>Item</th>
                      <th>Pcs</th>
                      <th>Weight</th>
                      <th>Delivery</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="empty-row">
                          Loading orders...
                        </td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="empty-row">
                          {searchText ? 'No matching order found.' : 'No order found yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order, index) => (
                        <tr key={order.id}>
                          <td>{index + 1}</td>
                          <td>{formatDate(order.orderDate)}</td>
                          <td>{order.orderNo}</td>
                          <td>{order.accountName}</td>
                          <td>{order.itemName}</td>
                          <td>{order.pcs || '-'}</td>
                          <td>{order.weight ? formatWeight(order.weight) : '-'}</td>
                          <td>{formatDate(order.deliveryDate)}</td>
                          <td>
                            <span className={statusBadgeClass(order.status)}>{order.status}</span>
                          </td>
                          <td>
                            {order.status === 'PENDING' && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => setDeliverTarget(order)}
                              >
                                Mark Delivered
                              </button>
                            )}
                            <button
                              className="table-delete"
                              type="button"
                              onClick={() => setDeleteTarget(order)}
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
                Order Payal books a customer&apos;s advance order for an item to be crafted or
                delivered later. It is an order record only - no stock or account ledger is posted
                here.
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deliverTarget)}
        title="Mark Order Delivered?"
        message={deliverTarget ? `Order ${deliverTarget.orderNo} will be marked as Delivered.` : ''}
        confirmText="Mark Delivered"
        cancelText="Cancel"
        type="info"
        loading={delivering}
        onConfirm={() => void handleConfirmDeliver()}
        onCancel={() => setDeliverTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Order?"
        message={deleteTarget ? `Order ${deleteTarget.orderNo} will be deleted.` : ''}
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

export default OrderPayalScreen
