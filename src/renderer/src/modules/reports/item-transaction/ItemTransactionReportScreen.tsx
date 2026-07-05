import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type ItemTransactionReportRecord = {
  id: string
  sourceType: string
  sourceId: string
  entryDate: string
  metalType: string
  pcsDelta: number
  grossWeightDelta: number
  netWeightDelta: number
  fineDelta: number
  narration: string
  createdAt: string
  itemId: string
  itemName: string
  groupName: string
  stampName: string
  designName: string
  saleNo: string
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

function getSourceLabel(sourceType: string): string {
  if (sourceType === 'OPENING_STOCK') return 'Opening Stock'
  if (sourceType === 'SALE') return 'Sale'
  if (sourceType === 'PURCHASE') return 'Purchase'
  return sourceType
}

function ItemTransactionReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [records, setRecords] = useState<ItemTransactionReportRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [loading, setLoading] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const metalMatch = metalFilter === 'All' || record.metalType === metalFilter
      const sourceMatch = sourceFilter === 'All' || record.sourceType === sourceFilter
      const keywordMatch =
        !keyword ||
        record.itemName.toLowerCase().includes(keyword) ||
        record.groupName.toLowerCase().includes(keyword) ||
        record.stampName.toLowerCase().includes(keyword) ||
        record.designName.toLowerCase().includes(keyword) ||
        record.saleNo.toLowerCase().includes(keyword) ||
        record.narration.toLowerCase().includes(keyword) ||
        record.entryDate.toLowerCase().includes(keyword)

      return metalMatch && sourceMatch && keywordMatch
    })
  }, [records, searchText, metalFilter, sourceFilter])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.pcs += Number(record.pcsDelta || 0)
        total.grossWeight += Number(record.grossWeightDelta || 0)
        total.netWeight += Number(record.netWeightDelta || 0)
        total.fine += Number(record.fineDelta || 0)
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
      const data = await window.api.reports.itemTransactions()
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
    <div className="item-transaction-report-screen">
      <div className="item-transaction-report-window">
        <div className="form-title-bar">
          <span>Item Transaction</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="item-transaction-report-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="item-transaction-toolbar">
            <div className="form-field">
              <label htmlFor="item-transaction-metal-filter">Metal</label>
              <select
                id="item-transaction-metal-filter"
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

            <div className="form-field">
              <label htmlFor="item-transaction-source-filter">Type</label>
              <select
                id="item-transaction-source-filter"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
              >
                <option value="All">All</option>
                <option value="OPENING_STOCK">Opening Stock</option>
                <option value="SALE">Sale</option>
                <option value="PURCHASE">Purchase</option>
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="item-transaction-search">Search</label>

              <input
                id="item-transaction-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search item, bill no, group, stamp, design"
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
          </div>

          <div className="item-transaction-summary">
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

            <div>
              <span>Showing</span>
              <strong>{filteredRecords.length}</strong>
            </div>
          </div>

          <div className="table-panel item-transaction-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Bill No</th>
                  <th>Item</th>
                  <th>Metal</th>
                  <th>Group</th>
                  <th>Stamp</th>
                  <th>Design</th>
                  <th>Pcs +/-</th>
                  <th>Gross +/-</th>
                  <th>Net +/-</th>
                  <th>Fine +/-</th>
                  <th>Narration</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={14} className="empty-row">
                      Loading item transactions...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="empty-row">
                      {searchText
                        ? 'No matching item transaction found.'
                        : 'No item transaction found yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={record.id}>
                      <td>{index + 1}</td>
                      <td>{formatDate(record.entryDate)}</td>
                      <td>{getSourceLabel(record.sourceType)}</td>
                      <td>{record.saleNo || '-'}</td>
                      <td>{record.itemName}</td>
                      <td>{record.metalType}</td>
                      <td>{record.groupName || '-'}</td>
                      <td>{record.stampName || '-'}</td>
                      <td>{record.designName || '-'}</td>
                      <td className={record.pcsDelta < 0 ? 'negative-value' : 'positive-value'}>
                        {formatNumber(record.pcsDelta)}
                      </td>
                      <td
                        className={
                          record.grossWeightDelta < 0 ? 'negative-value' : 'positive-value'
                        }
                      >
                        {formatNumber(record.grossWeightDelta)}
                      </td>
                      <td
                        className={record.netWeightDelta < 0 ? 'negative-value' : 'positive-value'}
                      >
                        {formatNumber(record.netWeightDelta)}
                      </td>
                      <td className={record.fineDelta < 0 ? 'negative-value' : 'positive-value'}>
                        {formatNumber(record.fineDelta)}
                      </td>
                      <td>{record.narration || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            Positive value means stock in. Negative value means stock out. Sale reduces stock.
            Cancelled sale removes its stock movement from this report.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemTransactionReportScreen
