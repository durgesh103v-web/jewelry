import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type Item = {
  id: string
  itemName: string
  metalType: string
  active: boolean
}

function formatWeight(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatPcs(value: number): string {
  return String(Number(value || 0))
}

function getLedgerTypeLabel(sourceType: string): string {
  if (sourceType === 'OPENING_STOCK') return 'Opening Stock'
  if (sourceType === 'SALE') return 'Sale'
  if (sourceType === 'SALE_RETURN') return 'Sale Return'
  if (sourceType === 'PURCHASE') return 'Purchase'
  if (sourceType === 'PURCHASE_RETURN') return 'Purchase Return'
  return sourceType
}

function getLedgerTypeClass(sourceType: string): string {
  if (sourceType === 'SALE' || sourceType === 'PURCHASE_RETURN') return 'type-badge sale'
  if (sourceType === 'PURCHASE' || sourceType === 'SALE_RETURN') return 'type-badge purchase'
  if (sourceType === 'OPENING_STOCK') return 'type-badge cash-receipt'
  return 'type-badge'
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function StockLedgerScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [items, setItems] = useState<Item[]>([])
  const [selectedItemId, setSelectedItemId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [report, setReport] = useState<ItemStockLedgerResult | null>(null)
  const [searchText, setSearchText] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const activeItems = useMemo(() => {
    return items.filter((item) => item.active)
  }, [items])

  const filteredRows = useMemo(() => {
    if (!report) return []

    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return report.rows

    return report.rows.filter((row) => {
      return (
        row.sourceType.toLowerCase().includes(keyword) ||
        row.billNo.toLowerCase().includes(keyword) ||
        row.metalType.toLowerCase().includes(keyword) ||
        row.stampName.toLowerCase().includes(keyword) ||
        row.designName.toLowerCase().includes(keyword) ||
        row.narration.toLowerCase().includes(keyword) ||
        row.entryDate.toLowerCase().includes(keyword)
      )
    })
  }, [report, searchText])

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

  const loadItems = useCallback(async (): Promise<void> => {
    try {
      setLoadingItems(true)
      const data = await window.api.items.list()
      setItems(data)

      const firstItem = data.find((item) => item.active)

      if (firstItem) {
        setSelectedItemId(firstItem.id)
      }
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoadingItems(false)
    }
  }, [showAlert])

  const loadReport = useCallback(
    async (itemId = selectedItemId): Promise<void> => {
      if (!itemId) {
        showAlert('warning', 'Please select item.')
        return
      }

      if (fromDate && toDate && fromDate > toDate) {
        showAlert('warning', 'From date cannot be after To date.')
        return
      }

      try {
        setLoading(true)
        const data = await window.api.reports.itemStockLedger(itemId, {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined
        })
        setReport(data)
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      } finally {
        setLoading(false)
      }
    },
    [selectedItemId, fromDate, toDate, showAlert]
  )

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadItems()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadItems])

  useEffect(() => {
    if (!selectedItemId) return undefined

    const loadTimer = window.setTimeout(() => {
      void loadReport(selectedItemId)
    }, 0)

    return () => window.clearTimeout(loadTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId])

  return (
    <div className="accountwise-details-screen stock-ledger-screen">
      <div className="accountwise-details-window">
        <div className="form-title-bar no-print">
          <span>Stock Ledger</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="accountwise-details-body">
          <div className="no-print">
            <AppAlert
              type={alertType}
              message={alertMessage}
              onClose={() => setAlertMessage('')}
            />
          </div>

          <div className="accountwise-details-toolbar party-statement-toolbar no-print">
            <div className="form-field">
              <label htmlFor="stock-ledger-item-select">Item</label>
              <select
                id="stock-ledger-item-select"
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
                disabled={loadingItems}
              >
                <option value="">Select Item</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemName} ({item.metalType})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="stock-ledger-from-date">From Date</label>
              <input
                id="stock-ledger-from-date"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="stock-ledger-to-date">To Date</label>
              <input
                id="stock-ledger-to-date"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>

            <div className="list-search">
              <label htmlFor="stock-ledger-search">Search</label>

              <input
                id="stock-ledger-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill no, type, stamp, design"
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
              onClick={() => void loadReport()}
              disabled={loading || !selectedItemId}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>

            <button
              className="btn-save"
              type="button"
              onClick={() => window.print()}
              disabled={!report}
            >
              Print
            </button>
          </div>

          <div className="accountwise-details-print-title">
            <h2>Stock Ledger</h2>
            <p>
              Item: {report ? report.item.itemName : 'Not selected'} | Period:{' '}
              {fromDate ? formatDate(fromDate) : 'Beginning'} to{' '}
              {toDate ? formatDate(toDate) : 'Today'}
              {searchText ? ` | Search Filter: ${searchText}` : ''}
            </p>
          </div>

          {report && (
            <div className="accountwise-balance-grid">
              <StockBalanceBox
                title="Opening Balance (Period Start)"
                pcs={report.openingBalance.pcs}
                grossWeight={report.openingBalance.grossWeight}
                netWeight={report.openingBalance.netWeight}
                fine={report.openingBalance.fine}
              />

              <StockBalanceBox
                title="Closing Balance"
                pcs={report.closingBalance.pcs}
                grossWeight={report.closingBalance.grossWeight}
                netWeight={report.closingBalance.netWeight}
                fine={report.closingBalance.fine}
              />
            </div>
          )}

          <div className="table-panel accountwise-details-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Date</th>
                  <th>Bill No</th>
                  <th>Type</th>
                  <th>Stamp</th>
                  <th>Design</th>
                  <th>Pcs +/-</th>
                  <th>Gross +/-</th>
                  <th>Net +/-</th>
                  <th>Fine +/-</th>
                  <th>Run Pcs</th>
                  <th>Run Net</th>
                  <th>Run Fine</th>
                  <th>Narration</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={14} className="empty-row">
                      Loading stock ledger...
                    </td>
                  </tr>
                ) : !report ? (
                  <tr>
                    <td colSpan={14} className="empty-row">
                      Select item to view stock ledger.
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="empty-row">
                      {searchText
                        ? 'No matching ledger entry found.'
                        : 'No stock movement found for this period.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.srNo}</td>
                      <td>{formatDate(row.entryDate)}</td>
                      <td>{row.billNo || '-'}</td>
                      <td>
                        <span className={getLedgerTypeClass(row.sourceType)}>
                          {getLedgerTypeLabel(row.sourceType)}
                        </span>
                      </td>
                      <td>{row.stampName || '-'}</td>
                      <td>{row.designName || '-'}</td>
                      <td>{formatPcs(row.pcsDelta)}</td>
                      <td>{formatWeight(row.grossWeightDelta)}</td>
                      <td>{formatWeight(row.netWeightDelta)}</td>
                      <td>{formatWeight(row.fineDelta)}</td>
                      <td>{formatPcs(row.runningPcs)}</td>
                      <td>{formatWeight(row.runningNetWeight)}</td>
                      <td>{formatWeight(row.runningFine)}</td>
                      <td>{row.narration || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text no-print">
            Running pcs/weight/fine balance for the selected item across Opening Stock, Purchase,
            Sale and Returns. Positive values increase stock, negative values decrease stock.
          </div>
        </div>
      </div>
    </div>
  )
}

function StockBalanceBox({
  title,
  pcs,
  grossWeight,
  netWeight,
  fine
}: {
  title: string
  pcs: number
  grossWeight: number
  netWeight: number
  fine: number
}): React.JSX.Element {
  return (
    <div className="accountwise-balance-box">
      <div className="accountwise-balance-title">{title}</div>

      <div>
        <span>Pcs</span>
        <strong>{formatPcs(pcs)}</strong>
      </div>

      <div>
        <span>Gross Weight</span>
        <strong>{formatWeight(grossWeight)}</strong>
      </div>

      <div>
        <span>Net Weight</span>
        <strong>{formatWeight(netWeight)}</strong>
      </div>

      <div>
        <span>Fine</span>
        <strong>{formatWeight(fine)}</strong>
      </div>
    </div>
  )
}

export default StockLedgerScreen
