import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type WeightScanForm = {
  scanDate: string
  barcode: string
  itemId: string
  grossWeight: string
  netWeight: string
  fine: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function createInitialForm(): WeightScanForm {
  return {
    scanDate: today,
    barcode: '',
    itemId: '',
    grossWeight: '',
    netWeight: '',
    fine: '',
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

function WeightScanScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState<WeightScanForm>(() => createInitialForm())
  const [items, setItems] = useState<ItemRecord[]>([])
  const [logs, setLogs] = useState<WeightScanRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WeightScanRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement | null>(null)

  const activeItems = useMemo(() => items.filter((item) => item.active), [items])

  const filteredLogs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return logs

    return logs.filter((log) => {
      return (
        log.barcode.toLowerCase().includes(keyword) ||
        log.itemName.toLowerCase().includes(keyword) ||
        log.narration.toLowerCase().includes(keyword) ||
        log.scanDate.toLowerCase().includes(keyword)
      )
    })
  }, [searchText, logs])

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

  const loadLogs = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.weightScans.list()
      setLogs(data)
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
      await Promise.all([loadItems(), loadLogs()])
    } finally {
      setLoading(false)
    }
  }, [loadItems, loadLogs])

  const handleNew = useCallback((): void => {
    setForm(createInitialForm())
    setAlertMessage('')

    window.setTimeout(() => {
      dateInputRef.current?.focus()
    }, 0)
  }, [])

  const validateForm = (): boolean => {
    if (!form.scanDate) {
      showAlert('warning', 'Please select scan date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.barcode.trim() && !form.itemId) {
      showAlert('warning', 'Please enter barcode or select an item.')
      barcodeInputRef.current?.focus()
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      await window.api.weightScans.create({
        scanDate: form.scanDate,
        barcode: form.barcode.trim(),
        itemId: form.itemId,
        grossWeight: Number(form.grossWeight || 0),
        netWeight: Number(form.netWeight || 0),
        fine: Number(form.fine || 0),
        narration: form.narration.trim()
      })

      await loadLogs()
      handleNew()
      showAlert('success', 'Weight scan log saved successfully.')
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
      await window.api.weightScans.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadLogs()
      showAlert('success', 'Weight scan log deleted successfully.')
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
    <div className="cash-voucher-screen weight-scan-screen">
      <div className="cash-voucher-window">
        <div className="form-title-bar">
          <span>Weight Scan</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="cash-voucher-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="cash-voucher-layout">
            <div className="cash-voucher-form-panel">
              <div className="cash-voucher-form-grid">
                <div className="form-field">
                  <label>Scan Date</label>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={form.scanDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, scanDate: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Barcode</label>
                  <input
                    ref={barcodeInputRef}
                    value={form.barcode}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, barcode: event.target.value }))
                    }
                    placeholder="Scan or type barcode"
                  />
                </div>

                <div className="form-field">
                  <label>Item</label>
                  <select
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
                  <label>Gross Weight</label>
                  <input
                    value={form.grossWeight}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, grossWeight: event.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Net Weight</label>
                  <input
                    value={form.netWeight}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, netWeight: event.target.value }))
                    }
                  />
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
                  {saving ? 'Saving...' : 'Save Scan'}
                </button>
                <button className="btn-new" type="button" onClick={handleNew} disabled={saving}>
                  New
                </button>
              </div>
            </div>

            <div className="cash-voucher-list-panel">
              <div className="list-search">
                <label htmlFor="weight-scan-search">Search</label>
                <input
                  id="weight-scan-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search barcode, item, narration"
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
                      <th>Barcode</th>
                      <th>Item</th>
                      <th>Gross Wt</th>
                      <th>Net Wt</th>
                      <th>Fine</th>
                      <th>Narration</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="empty-row">
                          Loading weight scan logs...
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="empty-row">
                          {searchText ? 'No matching log found.' : 'No weight scan log found yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, index) => (
                        <tr key={log.id}>
                          <td>{index + 1}</td>
                          <td>{formatDate(log.scanDate)}</td>
                          <td>{log.barcode || '-'}</td>
                          <td>{log.itemName || '-'}</td>
                          <td>{log.grossWeight ? formatWeight(log.grossWeight) : '-'}</td>
                          <td>{log.netWeight ? formatWeight(log.netWeight) : '-'}</td>
                          <td>{log.fine ? formatWeight(log.fine) : '-'}</td>
                          <td>{log.narration || '-'}</td>
                          <td>
                            <button
                              className="table-delete"
                              type="button"
                              onClick={() => setDeleteTarget(log)}
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
                Weight Scan is an audit log of items weighed on the scale for verification. It does
                not post to stock or account ledger.
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Weight Scan Log?"
        message={deleteTarget ? `This weight scan log dated ${formatDate(deleteTarget.scanDate)} will be deleted.` : ''}
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

export default WeightScanScreen
