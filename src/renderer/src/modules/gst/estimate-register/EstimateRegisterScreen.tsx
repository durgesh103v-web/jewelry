import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import EstimatePrintPreview from '../retail-sale-estimate/EstimatePrintPreview'

type AlertType = 'success' | 'error' | 'warning'

function formatNumber(value: number): string {
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

function getStatusLabel(status: EstimateStatus): string {
  if (status === 'OPEN') return 'Open'
  if (status === 'CONVERTED') return 'Converted'
  return 'Cancelled'
}

function EstimateRegisterScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [estimates, setEstimates] = useState<EstimateRegisterRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | EstimateStatus>('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [previewRecord, setPreviewRecord] = useState<SavedEstimateRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EstimateRegisterRecord | null>(null)
  const [convertTarget, setConvertTarget] = useState<EstimateRegisterRecord | null>(null)

  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [converting, setConverting] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

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

  const filteredEstimates = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return estimates.filter((estimate) => {
      const statusMatch = statusFilter === 'ALL' || estimate.status === statusFilter
      const fromMatch = !fromDate || estimate.estimate_date >= fromDate
      const toMatch = !toDate || estimate.estimate_date <= toDate
      const keywordMatch =
        !keyword ||
        estimate.estimate_no.toLowerCase().includes(keyword) ||
        estimate.account_name.toLowerCase().includes(keyword) ||
        estimate.mobile_number.toLowerCase().includes(keyword) ||
        estimate.metal_type.toLowerCase().includes(keyword) ||
        estimate.estimate_date.toLowerCase().includes(keyword)

      return statusMatch && fromMatch && toMatch && keywordMatch
    })
  }, [estimates, searchText, statusFilter, fromDate, toDate])

  const totals = useMemo(() => {
    return filteredEstimates.reduce(
      (total, estimate) => {
        total.fine += Number(estimate.item_fine_total || 0)
        total.majuri += Number(estimate.item_majuri_total || 0)
        total.taxableAmount += Number(estimate.taxable_amount || 0)
        total.totalTax +=
          Number(estimate.cgst_amount || 0) +
          Number(estimate.sgst_amount || 0) +
          Number(estimate.igst_amount || 0)
        return total
      },
      { fine: 0, majuri: 0, taxableAmount: 0, totalTax: 0 }
    )
  }, [filteredEstimates])

  const loadEstimates = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.estimates.list()
      setEstimates(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const openEstimate = async (estimateId: string): Promise<void> => {
    try {
      setOpening(true)
      const record = await window.api.estimates.getById(estimateId)
      setPreviewRecord(record)
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
      const result = await window.api.estimates.remove(deleteTarget.id)

      setDeleteTarget(null)
      await loadEstimates()
      showAlert('success', `Estimate ${result.estimateNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmConvert = async (): Promise<void> => {
    if (!convertTarget) return

    try {
      setConverting(true)
      const result = await window.api.estimates.convertToSale(convertTarget.id)

      setConvertTarget(null)
      await loadEstimates()
      showAlert(
        'success',
        `Estimate ${convertTarget.estimate_no} converted to sale ${result.sale.header.sale_no}.`
      )
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setConverting(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadEstimates()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadEstimates])

  return (
    <div className="sale-register-screen">
      <div className="sale-register-window">
        <div className="form-title-bar">
          <span>Estimate Register</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="sale-register-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="sale-register-toolbar">
            <div className="form-field">
              <label htmlFor="estimate-register-from-date">From Date</label>
              <input
                id="estimate-register-from-date"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="estimate-register-to-date">To Date</label>
              <input
                id="estimate-register-to-date"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="estimate-register-status">Status</label>
              <select
                id="estimate-register-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | EstimateStatus)}
              >
                <option value="ALL">All</option>
                <option value="OPEN">Open</option>
                <option value="CONVERTED">Converted</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="estimate-register-search">Search</label>

              <input
                id="estimate-register-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search estimate no, account, mobile, date, metal"
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
              onClick={() => void loadEstimates()}
              disabled={loading}
            >
              Refresh
            </button>

            <div className="record-summary">
              Total: <strong>{estimates.length}</strong> | Showing:{' '}
              <strong>{filteredEstimates.length}</strong>
            </div>
          </div>

          <div className="sale-register-summary">
            <div>
              <span>Total Fine</span>
              <strong>{formatNumber(totals.fine)}</strong>
            </div>

            <div>
              <span>Total Majuri</span>
              <strong>{formatAmount(totals.majuri)}</strong>
            </div>

            <div>
              <span>Taxable Amount</span>
              <strong>{formatAmount(totals.taxableAmount)}</strong>
            </div>

            <div>
              <span>Total Tax</span>
              <strong>{formatAmount(totals.totalTax)}</strong>
            </div>
          </div>

          <div className="table-panel sale-register-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Est. No</th>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Mobile</th>
                  <th>Metal</th>
                  <th>Fine</th>
                  <th>Majuri</th>
                  <th>Taxable Amt</th>
                  <th>Total Tax</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="empty-row">
                      Loading estimate register...
                    </td>
                  </tr>
                ) : filteredEstimates.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="empty-row">
                      {searchText || statusFilter !== 'ALL' || fromDate || toDate
                        ? 'No matching estimate found.'
                        : 'No estimate saved yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredEstimates.map((estimate, index) => {
                    const totalTax =
                      Number(estimate.cgst_amount || 0) +
                      Number(estimate.sgst_amount || 0) +
                      Number(estimate.igst_amount || 0)

                    return (
                      <tr key={estimate.id} onDoubleClick={() => void openEstimate(estimate.id)}>
                        <td>{index + 1}</td>
                        <td>{estimate.estimate_no}</td>
                        <td>{formatDate(estimate.estimate_date)}</td>
                        <td>{estimate.account_name}</td>
                        <td>{estimate.mobile_number || '-'}</td>
                        <td>{estimate.metal_type}</td>
                        <td>{formatNumber(estimate.item_fine_total)}</td>
                        <td>{formatAmount(estimate.item_majuri_total)}</td>
                        <td>{formatAmount(estimate.taxable_amount)}</td>
                        <td>{formatAmount(totalTax)}</td>
                        <td>
                          <span className={`approval-badge ${estimate.status.toLowerCase()}`}>
                            {getStatusLabel(estimate.status)}
                          </span>
                        </td>
                        <td>
                          <div
                            className="sale-register-actions"
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            <button
                              className="table-edit"
                              type="button"
                              onClick={() => void openEstimate(estimate.id)}
                              disabled={opening}
                            >
                              Open / Print
                            </button>

                            {estimate.status === 'OPEN' && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => setConvertTarget(estimate)}
                                disabled={converting}
                              >
                                Convert to Sale
                              </button>
                            )}

                            {estimate.status === 'OPEN' && (
                              <button
                                className="table-delete"
                                type="button"
                                onClick={() => setDeleteTarget(estimate)}
                                disabled={deleting}
                              >
                                Delete
                              </button>
                            )}
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
            Double click any estimate or click Open / Print to view and print it again, or convert
            it into a real Sale bill.
          </div>
        </div>
      </div>

      {previewRecord && (
        <EstimatePrintPreview estimate={previewRecord} onClose={() => setPreviewRecord(null)} />
      )}

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Estimate?"
        message={
          deleteTarget
            ? `Are you sure you want to delete estimate "${deleteTarget.estimate_no}" for "${deleteTarget.account_name}"?`
            : ''
        }
        confirmText="Delete"
        cancelText="Close"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
      />

      <AppConfirmDialog
        open={Boolean(convertTarget)}
        title="Convert to Sale?"
        message={
          convertTarget
            ? `Estimate "${convertTarget.estimate_no}" will be converted into a real Sale bill. This will post stock and account ledger effects. This cannot be undone.`
            : ''
        }
        confirmText="Convert"
        cancelText="Cancel"
        type="info"
        loading={converting}
        onConfirm={() => void handleConfirmConvert()}
        onCancel={() => {
          if (!converting) setConvertTarget(null)
        }}
      />
    </div>
  )
}

export default EstimateRegisterScreen
