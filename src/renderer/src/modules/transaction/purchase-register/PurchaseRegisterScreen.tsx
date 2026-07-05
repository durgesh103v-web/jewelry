import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import PurchasePrintPreview from '../purchase/PurchasePrintPreview'

type AlertType = 'success' | 'error' | 'warning'

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

function PurchaseRegisterScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [records, setRecords] = useState<PurchaseRegisterRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<SavedPurchaseRecord | null>(null)
  const [purchaseToCancel, setPurchaseToCancel] = useState<PurchaseRegisterRecord | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const metalMatch = metalFilter === 'All' || record.metalType === metalFilter
      const keywordMatch =
        !keyword ||
        record.purchaseNo.toLowerCase().includes(keyword) ||
        record.accountName.toLowerCase().includes(keyword) ||
        record.mobileNumber.toLowerCase().includes(keyword) ||
        record.metalType.toLowerCase().includes(keyword) ||
        record.purchaseDate.toLowerCase().includes(keyword)

      return metalMatch && keywordMatch
    })
  }, [records, searchText, metalFilter])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.itemFineTotal += Number(record.itemFineTotal || 0)
        total.itemMajuriTotal += Number(record.itemMajuriTotal || 0)
        total.paymentFineNaveTotal += Number(record.paymentFineNaveTotal || 0)
        total.paymentCashNaveTotal += Number(record.paymentCashNaveTotal || 0)
        return total
      },
      {
        itemFineTotal: 0,
        itemMajuriTotal: 0,
        paymentFineNaveTotal: 0,
        paymentCashNaveTotal: 0
      }
    )
  }, [filteredRecords])

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

  const loadPurchases = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.purchases.list()
      setRecords(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const openPurchase = async (id: string): Promise<void> => {
    try {
      setOpening(true)
      const data = await window.api.purchases.getById(id)
      setSelectedPurchase(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleCancelPurchase = async (): Promise<void> => {
    if (!purchaseToCancel) return

    try {
      setCancelling(true)
      const result = await window.api.purchases.cancel(purchaseToCancel.id)
      showAlert('success', `${result.purchaseNo} cancelled successfully.`)
      setPurchaseToCancel(null)
      await loadPurchases()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setCancelling(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadPurchases()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadPurchases])
  return (
    <div className="purchase-register-screen">
      <div className="purchase-register-window">
        <div className="form-title-bar">
          <span>Purchase Register</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="purchase-register-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="purchase-register-toolbar">
            <div className="form-field">
              <label>Metal</label>
              <select value={metalFilter} onChange={(event) => setMetalFilter(event.target.value)}>
                <option>All</option>
                <option>Gold</option>
                <option>Silver</option>
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="purchase-register-search">Search</label>
              <input
                id="purchase-register-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill no, supplier, mobile, date"
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
              onClick={() => void loadPurchases()}
              disabled={loading}
            >
              Refresh
            </button>

            <div className="record-summary">
              Records: <strong>{records.length}</strong> | Showing:{' '}
              <strong>{filteredRecords.length}</strong>
            </div>
          </div>

          <div className="purchase-register-summary">
            <div>
              <span>Purchase Fine Jama</span>
              <strong>{formatNumber(totals.itemFineTotal)}</strong>
            </div>
            <div>
              <span>Majuri Jama</span>
              <strong>{formatNumber(totals.itemMajuriTotal)}</strong>
            </div>
            <div>
              <span>Fine Nave</span>
              <strong>{formatNumber(totals.paymentFineNaveTotal)}</strong>
            </div>
            <div>
              <span>Cash Nave</span>
              <strong>{formatNumber(totals.paymentCashNaveTotal)}</strong>
            </div>
          </div>

          <div className="table-panel purchase-register-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Bill No</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Mobile</th>
                  <th>Metal</th>
                  <th>Fine Jama</th>
                  <th>Majuri Jama</th>
                  <th>Fine Nave</th>
                  <th>Cash Nave</th>
                  <th>Closing Fine</th>
                  <th>Closing Cash</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="empty-row">
                      Loading purchases...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="empty-row">
                      {searchText ? 'No matching purchase found.' : 'No purchase found yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => {
                    const closingFine =
                      record.metalType === 'Gold'
                        ? record.closingGoldFine
                        : record.closingSilverFine

                    return (
                      <tr key={record.id} onDoubleClick={() => void openPurchase(record.id)}>
                        <td>{index + 1}</td>
                        <td>{record.purchaseNo}</td>
                        <td>{formatDate(record.purchaseDate)}</td>
                        <td>{record.accountName}</td>
                        <td>{record.mobileNumber || '-'}</td>
                        <td>{record.metalType}</td>
                        <td>{formatNumber(record.itemFineTotal)}</td>
                        <td>{formatNumber(record.itemMajuriTotal)}</td>
                        <td>{formatNumber(record.paymentFineNaveTotal)}</td>
                        <td>{formatNumber(record.paymentCashNaveTotal)}</td>
                        <td>{formatNumber(closingFine)}</td>
                        <td>{formatNumber(record.closingCash)}</td>
                        <td>
                          <div
                            className="sale-register-actions"
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            <button
                              className="table-edit"
                              type="button"
                              onClick={() => void openPurchase(record.id)}
                              disabled={opening || cancelling}
                            >
                              Open / Print
                            </button>
                            <button
                              className="table-delete"
                              type="button"
                              onClick={() => setPurchaseToCancel(record)}
                              disabled={opening || cancelling}
                            >
                              Cancel
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
            Purchase Register shows saved purchase bills. Cancel removes stock and ledger effect,
            but keeps cancelled bill history in database.
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(purchaseToCancel)}
        title="Cancel Purchase Bill?"
        message={
          purchaseToCancel
            ? `Purchase bill ${purchaseToCancel.purchaseNo} will be cancelled. Stock and supplier ledger effect will be removed.`
            : ''
        }
        confirmText="Cancel Purchase"
        cancelText="No"
        type="danger"
        loading={cancelling}
        onConfirm={() => void handleCancelPurchase()}
        onCancel={() => {
          if (!cancelling) {
            setPurchaseToCancel(null)
          }
        }}
      />

      {selectedPurchase && (
        <PurchasePrintPreview
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}
    </div>
  )
}

export default PurchaseRegisterScreen
