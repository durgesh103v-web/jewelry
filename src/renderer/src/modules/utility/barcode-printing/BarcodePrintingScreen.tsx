import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import JSBarcode from 'jsbarcode'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type Item = {
  id: string
  itemName: string
  metalType: string
  barcodeType: string
  barcodeValue: string
  defaultTanch: number
  defaultWastage: number
  active: boolean
}

type LabelEntry = {
  key: string
  itemId: string
  itemName: string
  metalType: string
  tunch: number
  wastage: number
  barcodeValue: string
  barcodeFormat: string
}

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function resolveBarcodeFormat(barcodeType: string): string {
  if (barcodeType === 'EAN13') return 'EAN13'
  return 'CODE128'
}

function BarcodeLabel({ entry }: { entry: LabelEntry }): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!svgRef.current || !entry.barcodeValue) return

    try {
      JSBarcode(svgRef.current, entry.barcodeValue, {
        format: entry.barcodeFormat,
        displayValue: true,
        fontSize: 12,
        height: 40,
        margin: 4
      })
    } catch {
      // Ignore render errors for values that don't fit the selected barcode format.
    }
  }, [entry.barcodeValue, entry.barcodeFormat])

  return (
    <div className="barcode-label">
      <div className="barcode-label-item-name">{entry.itemName}</div>
      <div className="barcode-label-meta">
        {entry.metalType}
        {entry.tunch || entry.wastage
          ? ` | T:${formatNumber(entry.tunch)} W:${formatNumber(entry.wastage)}`
          : ''}
      </div>
      <svg ref={svgRef} className="barcode-label-svg" />
    </div>
  )
}

function BarcodePrintingScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [items, setItems] = useState<Item[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [labelQueue, setLabelQueue] = useState<LabelEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
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

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)

      const [itemData, stockData] = await Promise.all([
        window.api.items.list(),
        window.api.reports.itemStock()
      ])

      const activeItems = itemData.filter((item) => item.active)
      setItems(activeItems)

      const nextStockMap: Record<string, number> = {}
      stockData.forEach((record) => {
        nextStockMap[record.itemId] = (nextStockMap[record.itemId] ?? 0) + Number(record.pcs || 0)
      })
      setStockMap(nextStockMap)

      setQuantities((current) => {
        const next = { ...current }

        activeItems.forEach((item) => {
          if (next[item.id] === undefined) {
            const stockPcs = Math.round(nextStockMap[item.id] ?? 0)
            next[item.id] = String(stockPcs > 0 ? stockPcs : 1)
          }
        })

        return next
      })
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    void loadData()

    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadData])

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return items.filter((item) => {
      const metalMatch = metalFilter === 'All' || item.metalType === metalFilter
      const keywordMatch = !keyword || item.itemName.toLowerCase().includes(keyword)
      return metalMatch && keywordMatch
    })
  }, [items, searchText, metalFilter])

  const selectedCount = useMemo(() => {
    return Object.values(selected).filter(Boolean).length
  }, [selected])

  const toggleSelected = (itemId: string): void => {
    setSelected((current) => ({
      ...current,
      [itemId]: !current[itemId]
    }))
  }

  const handleQuantityChange = (itemId: string, value: string): void => {
    if (!/^\d*$/.test(value)) return

    setQuantities((current) => ({
      ...current,
      [itemId]: value
    }))
  }

  const handleSelectAllVisible = (): void => {
    setSelected((current) => {
      const next = { ...current }

      filteredItems.forEach((item) => {
        next[item.id] = true
      })

      return next
    })
  }

  const handleClearSelection = (): void => {
    setSelected({})
    setLabelQueue([])
  }

  const handleGenerateLabels = async (): Promise<void> => {
    const selectedItems = items.filter((item) => selected[item.id])

    if (selectedItems.length === 0) {
      showAlert('warning', 'Please select at least one item.')
      return
    }

    try {
      setGenerating(true)

      const resolvedItems: Item[] = []

      for (const item of selectedItems) {
        if (item.barcodeValue) {
          resolvedItems.push(item)
          continue
        }

        const updated = await window.api.items.assignBarcode(item.id)
        resolvedItems.push(updated)
      }

      setItems((current) =>
        current.map((item) => resolvedItems.find((updated) => updated.id === item.id) ?? item)
      )

      const queue: LabelEntry[] = []

      resolvedItems.forEach((item) => {
        const copies = Math.max(1, Number(quantities[item.id] || 1) || 1)

        for (let index = 0; index < copies; index += 1) {
          queue.push({
            key: `${item.id}-${index}`,
            itemId: item.id,
            itemName: item.itemName,
            metalType: item.metalType,
            tunch: item.defaultTanch,
            wastage: item.defaultWastage,
            barcodeValue: item.barcodeValue,
            barcodeFormat: resolveBarcodeFormat(item.barcodeType)
          })
        }
      })

      setLabelQueue(queue)
      showAlert(
        'success',
        `Generated ${queue.length} label(s) for ${resolvedItems.length} item(s).`
      )
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="barcode-printing-screen">
      <div className="barcode-printing-window">
        <div className="form-title-bar no-print">
          <span>Barcode Printing</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="barcode-printing-body">
          <div className="no-print">
            <AppAlert
              type={alertType}
              message={alertMessage}
              onClose={() => setAlertMessage('')}
            />
          </div>

          <div className="barcode-printing-toolbar no-print">
            <div className="form-field">
              <label htmlFor="barcode-printing-metal-filter">Metal</label>
              <select
                id="barcode-printing-metal-filter"
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
              <label htmlFor="barcode-printing-search">Search</label>

              <input
                id="barcode-printing-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search item name"
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

            <button className="btn-new" type="button" onClick={handleSelectAllVisible}>
              Select All
            </button>

            <button className="btn-cancel-edit" type="button" onClick={handleClearSelection}>
              Clear Selection
            </button>

            <button
              className="btn-save"
              type="button"
              onClick={() => void handleGenerateLabels()}
              disabled={generating || selectedCount === 0}
            >
              {generating ? 'Generating...' : `Generate Labels (${selectedCount})`}
            </button>

            <button
              className="btn-save"
              type="button"
              onClick={() => window.print()}
              disabled={labelQueue.length === 0}
            >
              Print
            </button>

            <div className="record-summary">
              Items: <strong>{items.length}</strong> | Selected: <strong>{selectedCount}</strong>{' '}
              | Labels: <strong>{labelQueue.length}</strong>
            </div>
          </div>

          <div className="table-panel barcode-printing-table-panel no-print">
            <table>
              <thead>
                <tr>
                  <th>Sel</th>
                  <th>Item Name</th>
                  <th>Metal</th>
                  <th>Tunch</th>
                  <th>Wastage</th>
                  <th>Stock Pcs</th>
                  <th>Barcode</th>
                  <th>Copies</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="empty-row">
                      Loading items...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-row">
                      No item found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[item.id])}
                          onChange={() => toggleSelected(item.id)}
                        />
                      </td>
                      <td>{item.itemName}</td>
                      <td>{item.metalType}</td>
                      <td>{formatNumber(item.defaultTanch)}</td>
                      <td>{formatNumber(item.defaultWastage)}</td>
                      <td>{formatNumber(stockMap[item.id] ?? 0)}</td>
                      <td>{item.barcodeValue || 'Not assigned'}</td>
                      <td>
                        <input
                          className="barcode-printing-qty-input"
                          value={quantities[item.id] ?? '1'}
                          onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text no-print">
            Select item(s), set copies, then click Generate Labels. Items without a barcode value
            are assigned one automatically. Click Print to print the label sheet.
          </div>

          {labelQueue.length > 0 && (
            <div className="barcode-label-sheet">
              {labelQueue.map((entry) => (
                <BarcodeLabel key={entry.key} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BarcodePrintingScreen
