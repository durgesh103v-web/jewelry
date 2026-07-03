import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import SalePrintPreview, { type SavedSaleRecord } from '../sale/SalePrintPreview'

type AlertType = 'success' | 'error' | 'warning'

type SaleRegisterRecord = {
  id: string
  sale_no: string
  sale_date: string
  metal_type: string
  item_fine_total: number
  item_majuri_total: number
  payment_fine_jama_total: number
  payment_cash_jama_total: number
  closing_gold_fine: number
  closing_silver_fine: number
  closing_cash: number
  account_name: string
  mobile_number: string
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

function SaleRegisterScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [sales, setSales] = useState<SaleRegisterRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedSale, setSelectedSale] = useState<SavedSaleRecord | null>(null)
  const [cancelTarget, setCancelTarget] = useState<SaleRegisterRecord | null>(null)

  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const filteredSales = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return sales

    return sales.filter((sale) => {
      return (
        sale.sale_no.toLowerCase().includes(keyword) ||
        sale.account_name.toLowerCase().includes(keyword) ||
        sale.mobile_number.toLowerCase().includes(keyword) ||
        sale.metal_type.toLowerCase().includes(keyword) ||
        sale.sale_date.toLowerCase().includes(keyword)
      )
    })
  }, [sales, searchText])

  const totals = useMemo(() => {
    return filteredSales.reduce(
      (total, sale) => {
        total.fine += Number(sale.item_fine_total || 0)
        total.majuri += Number(sale.item_majuri_total || 0)
        total.fineJama += Number(sale.payment_fine_jama_total || 0)
        total.cashJama += Number(sale.payment_cash_jama_total || 0)
        return total
      },
      {
        fine: 0,
        majuri: 0,
        fineJama: 0,
        cashJama: 0
      }
    )
  }, [filteredSales])

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

  const loadSales = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.sales.list()
      setSales(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const openSale = async (saleId: string): Promise<void> => {
    try {
      setOpening(true)
      const sale = await window.api.sales.getById(saleId)
      setSelectedSale(sale)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleConfirmCancelSale = async (): Promise<void> => {
    if (!cancelTarget) return

    try {
      setCancelling(true)
      const result = await window.api.sales.cancel(cancelTarget.id)

      setCancelTarget(null)
      await loadSales()
      showAlert('success', `Sale bill ${result.saleNo} cancelled successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setCancelling(false)
    }
  }

  const handleCancelDialogClose = (): void => {
    if (cancelling) return
    setCancelTarget(null)
  }
  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadSales()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadSales])

  return (
    <div className="sale-register-screen">
      <div className="sale-register-window">
        <div className="form-title-bar">
          <span>Sale Register</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="sale-register-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="sale-register-toolbar">
            <div className="list-search">
              <label htmlFor="sale-register-search">Search</label>

              <input
                id="sale-register-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill no, account, mobile, date, metal"
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
              onClick={() => void loadSales()}
              disabled={loading}
            >
              Refresh
            </button>

            <div className="record-summary">
              Total Bills: <strong>{sales.length}</strong> | Showing:{' '}
              <strong>{filteredSales.length}</strong>
            </div>
          </div>

          <div className="sale-register-summary">
            <div>
              <span>Total Fine</span>
              <strong>{formatNumber(totals.fine)}</strong>
            </div>

            <div>
              <span>Total Majuri</span>
              <strong>{formatNumber(totals.majuri)}</strong>
            </div>

            <div>
              <span>Fine Jama</span>
              <strong>{formatNumber(totals.fineJama)}</strong>
            </div>

            <div>
              <span>Cash Jama</span>
              <strong>{formatNumber(totals.cashJama)}</strong>
            </div>
          </div>

          <div className="table-panel sale-register-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Bill No</th>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Mobile</th>
                  <th>Metal</th>
                  <th>Item Fine</th>
                  <th>Majuri</th>
                  <th>Fine Jama</th>
                  <th>Cash Jama</th>
                  <th>Closing Fine</th>
                  <th>Closing Cash</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="empty-row">
                      Loading sale register...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="empty-row">
                      {searchText ? 'No matching sale bill found.' : 'No sale bill saved yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale, index) => {
                    const closingFine =
                      sale.metal_type === 'Gold' ? sale.closing_gold_fine : sale.closing_silver_fine

                    return (
                      <tr key={sale.id} onDoubleClick={() => void openSale(sale.id)}>
                        <td>{index + 1}</td>
                        <td>{sale.sale_no}</td>
                        <td>{formatDate(sale.sale_date)}</td>
                        <td>{sale.account_name}</td>
                        <td>{sale.mobile_number || '-'}</td>
                        <td>{sale.metal_type}</td>
                        <td>{formatNumber(sale.item_fine_total)}</td>
                        <td>{formatNumber(sale.item_majuri_total)}</td>
                        <td>{formatNumber(sale.payment_fine_jama_total)}</td>
                        <td>{formatNumber(sale.payment_cash_jama_total)}</td>
                        <td>{formatNumber(closingFine)}</td>
                        <td>{formatNumber(sale.closing_cash)}</td>
                        <td>
                          <div
                            className="sale-register-actions"
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            <button
                              className="table-edit"
                              type="button"
                              onClick={() => void openSale(sale.id)}
                              disabled={opening || cancelling}
                            >
                              Open / Print
                            </button>

                            <button
                              className="table-delete"
                              type="button"
                              onClick={() => setCancelTarget(sale)}
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
            Double click any bill or click Open / Print to view old sale bill and print again.
          </div>
        </div>
      </div>

      {selectedSale && (
        <SalePrintPreview sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}
      <AppConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel Sale Bill?"
        message={
          cancelTarget
            ? `Are you sure you want to cancel bill "${cancelTarget.sale_no}" for "${cancelTarget.account_name}"? This will remove its stock and ledger effect.`
            : ''
        }
        confirmText="Cancel Bill"
        cancelText="Close"
        type="danger"
        loading={cancelling}
        onConfirm={() => void handleConfirmCancelSale()}
        onCancel={handleCancelDialogClose}
      />
    </div>
  )
}

export default SaleRegisterScreen
