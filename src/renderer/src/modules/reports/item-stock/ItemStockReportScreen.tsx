import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type ItemStockReportRecord = {
  itemId: string
  itemName: string
  metalType: string
  groupName: string
  stampId: string
  stampName: string
  designId: string
  designName: string
  pcs: number
  grossWeight: number
  netWeight: number
  fine: number
}

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function ItemStockReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [records, setRecords] = useState<ItemStockReportRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
  const [loading, setLoading] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const metalMatch = metalFilter === 'All' || record.metalType === metalFilter
      const keywordMatch =
        !keyword ||
        record.itemName.toLowerCase().includes(keyword) ||
        record.groupName.toLowerCase().includes(keyword) ||
        record.stampName.toLowerCase().includes(keyword) ||
        record.designName.toLowerCase().includes(keyword) ||
        record.metalType.toLowerCase().includes(keyword)

      return metalMatch && keywordMatch
    })
  }, [records, searchText, metalFilter])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.pcs += Number(record.pcs || 0)
        total.grossWeight += Number(record.grossWeight || 0)
        total.netWeight += Number(record.netWeight || 0)
        total.fine += Number(record.fine || 0)
        return total
      },
      {
        pcs: 0,
        grossWeight: 0,
        netWeight: 0,
        fine: 0
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

  const loadReport = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.reports.itemStock()
      setRecords(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadReport()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadReport])

  return (
    <div className="item-stock-report-screen">
      <div className="item-stock-report-window">
        <div className="form-title-bar">
          <span>Item Stock</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="item-stock-report-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="item-stock-toolbar">
            <div className="form-field">
              <label htmlFor="item-stock-metal-filter">Metal</label>
              <select
                id="item-stock-metal-filter"
                value={metalFilter}
                onChange={(event) => setMetalFilter(event.target.value)}
              >
                <option>All</option>
                <option>Gold</option>
                <option>Silver</option>
                <option>Diamond</option>
                <option>Other</option>
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="item-stock-search">Search</label>

              <input
                id="item-stock-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search item, group, stamp, design"
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
              disabled={loading}
            >
              Refresh
            </button>

            <div className="record-summary">
              Records: <strong>{records.length}</strong> | Showing:{' '}
              <strong>{filteredRecords.length}</strong>
            </div>
          </div>

          <div className="item-stock-summary">
            <div>
              <span>Pcs</span>
              <strong>{formatNumber(totals.pcs)}</strong>
            </div>

            <div>
              <span>Gross Wt.</span>
              <strong>{formatNumber(totals.grossWeight)}</strong>
            </div>

            <div>
              <span>Net Wt.</span>
              <strong>{formatNumber(totals.netWeight)}</strong>
            </div>

            <div>
              <span>Fine</span>
              <strong>{formatNumber(totals.fine)}</strong>
            </div>
          </div>

          <div className="table-panel item-stock-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Item</th>
                  <th>Metal</th>
                  <th>Group</th>
                  <th>Stamp</th>
                  <th>Design</th>
                  <th>Pcs</th>
                  <th>Gross Wt.</th>
                  <th>Net Wt.</th>
                  <th>Fine</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="empty-row">
                      Loading item stock...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-row">
                      {searchText ? 'No matching stock found.' : 'No stock found yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={`${record.itemId}-${record.stampId}-${record.designId}`}>
                      <td>{index + 1}</td>
                      <td>{record.itemName}</td>
                      <td>{record.metalType}</td>
                      <td>{record.groupName || '-'}</td>
                      <td>{record.stampName || '-'}</td>
                      <td>{record.designName || '-'}</td>
                      <td>{formatNumber(record.pcs)}</td>
                      <td>{formatNumber(record.grossWeight)}</td>
                      <td>{formatNumber(record.netWeight)}</td>
                      <td>{formatNumber(record.fine)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            Item Stock is calculated from Stock Ledger. Opening Stock adds quantity. Sale reduces
            quantity. Cancelled sale removes its stock effect.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemStockReportScreen
