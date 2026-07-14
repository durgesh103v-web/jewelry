import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function ItemSalePurchaseCityWiseReportScreen({
  onClose
}: {
  onClose: () => void
}): React.JSX.Element {
  const [records, setRecords] = useState<ItemSalePurchaseCityWiseRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [cityFilter, setCityFilter] = useState('All')
  const [metalFilter, setMetalFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const cityOptions = useMemo(() => {
    const set = new Set<string>()
    records.forEach((record) => set.add(record.city))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [records])

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
      const data = await window.api.reports.itemSalePurchaseCityWise()
      setRecords(data || [])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const cityMatch = cityFilter === 'All' || record.city === cityFilter
      const metalMatch = metalFilter === 'All' || record.metalType === metalFilter
      const keywordMatch =
        !keyword ||
        record.itemName.toLowerCase().includes(keyword) ||
        record.groupName.toLowerCase().includes(keyword) ||
        record.city.toLowerCase().includes(keyword)

      return cityMatch && metalMatch && keywordMatch
    })
  }, [records, cityFilter, metalFilter, searchText])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.saleNetWeight += record.saleNetWeight
        total.saleFine += record.saleFine
        total.purchaseNetWeight += record.purchaseNetWeight
        total.purchaseFine += record.purchaseFine
        return total
      },
      { saleNetWeight: 0, saleFine: 0, purchaseNetWeight: 0, purchaseFine: 0 }
    )
  }, [filteredRecords])

  return (
    <div className="account-wise-sp-screen">
      <div className="account-wise-sp-window">
        <div className="form-title-bar">
          <span>Item Sale Purchase City Wise</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-wise-sp-body">
          <div className="no-print">
            <AppAlert
              type={alertType}
              message={alertMessage}
              onClose={() => setAlertMessage('')}
            />
          </div>

          <div className="account-wise-sp-toolbar item-city-sp-toolbar no-print">
            <div className="form-field">
              <label htmlFor="item-city-sp-city-filter">City</label>
              <select
                id="item-city-sp-city-filter"
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
              >
                <option value="All">All Cities</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="item-city-sp-metal-filter">Metal</label>
              <select
                id="item-city-sp-metal-filter"
                value={metalFilter}
                onChange={(event) => setMetalFilter(event.target.value)}
              >
                <option>All</option>
                <option>Gold</option>
                <option>Silver</option>
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="item-city-sp-search">Search</label>
              <input
                id="item-city-sp-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search item, group, city"
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
              {loading ? 'Loading...' : 'Refresh'}
            </button>

            <button className="btn-save" type="button" onClick={() => window.print()}>
              Print
            </button>
          </div>

          <div className="account-wise-sp-summary">
            <div>
              <span>Total Sale Weight</span>
              <strong>{formatNumber(totals.saleNetWeight)}</strong>
            </div>
            <div>
              <span>Total Sale Fine</span>
              <strong>{formatNumber(totals.saleFine)}</strong>
            </div>
            <div>
              <span>Total Purchase Weight</span>
              <strong>{formatNumber(totals.purchaseNetWeight)}</strong>
            </div>
            <div>
              <span>Total Purchase Fine</span>
              <strong>{formatNumber(totals.purchaseFine)}</strong>
            </div>
            <div>
              <span>Showing</span>
              <strong>{filteredRecords.length}</strong>
            </div>
          </div>

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Item</th>
                  <th>Group</th>
                  <th>Metal</th>
                  <th>City</th>
                  <th>Sale Pcs</th>
                  <th>Sale Weight</th>
                  <th>Sale Fine</th>
                  <th>Purchase Pcs</th>
                  <th>Purchase Weight</th>
                  <th>Purchase Fine</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      Loading item sale purchase city wise...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      {searchText || cityFilter !== 'All' || metalFilter !== 'All'
                        ? 'No matching item found.'
                        : 'No sale or purchase movement found yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={`${record.itemId}-${record.city}`}>
                      <td>{index + 1}</td>
                      <td>{record.itemName}</td>
                      <td>{record.groupName || '-'}</td>
                      <td>{record.metalType}</td>
                      <td>{record.city}</td>
                      <td>{formatNumber(record.salePcs)}</td>
                      <td>{formatNumber(record.saleNetWeight)}</td>
                      <td>{formatNumber(record.saleFine)}</td>
                      <td>{formatNumber(record.purchasePcs)}</td>
                      <td>{formatNumber(record.purchaseNetWeight)}</td>
                      <td>{formatNumber(record.purchaseFine)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            Item Sale Purchase City Wise groups the same Stock Ledger totals as Itemwise Sale
            Purchase, further split by the customer/supplier account&apos;s City, to see which
            items sell well in which city. Rows with no city recorded on the account are grouped
            under &quot;Unknown&quot;.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemSalePurchaseCityWiseReportScreen
