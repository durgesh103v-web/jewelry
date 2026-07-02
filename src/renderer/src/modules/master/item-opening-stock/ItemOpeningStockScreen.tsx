import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type Item = {
  id: string
  itemName: string
  metalType: string
  itemGroupId: string
  groupName: string
  defaultStampId: string
  stampName: string
  defaultDesignId: string
  designName: string
  barcodeItem: boolean
  barcodeType: string
  labourChargesBy: string
  salePurchaseBy: string
  gstHsnCode: string
  fixedWeightPerPcs: number
  active: boolean
}

type ItemStamp = {
  id: string
  stampName: string
  metalType: string
  description: string
  active: boolean
}

type ItemDesign = {
  id: string
  designName: string
  metalType: string
  description: string
  active: boolean
}

type OpeningStock = {
  id: string
  stockDate: string
  itemId: string
  itemName: string
  metalType: string
  stampId: string
  stampName: string
  designId: string
  designName: string
  barcode: string
  remark: string
  pcs: number
  grossWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  tanch: number
  wastage: number
  hishob: number
  unit: string
  fine: number
  active: boolean
}

const initialForm = {
  stockDate: getTodayDate(),
  itemId: '',
  stampId: '',
  designId: '',
  barcode: '',
  remark: '',
  pcs: '',
  grossWeight: '',
  lessWeight: '',
  addWeight: '',
  tanch: '',
  wastage: '',
  hishob: '',
  unit: 'GM',
  active: true
}

function getTodayDate(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toNumber(value: string | number): number {
  if (value === '') return 0

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function roundNumber(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function isValidAmountInput(value: string): boolean {
  return /^-?\d*\.?\d*$/.test(value)
}

function calculateNetWeight(grossWeight: string, lessWeight: string, addWeight: string): number {
  return roundNumber(toNumber(grossWeight) - toNumber(lessWeight) + toNumber(addWeight))
}

function calculateFine(netWeight: number, tanch: string, wastage: string): number {
  return roundNumber((netWeight * (toNumber(tanch) + toNumber(wastage))) / 100)
}

function ItemOpeningStockScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [openingStocks, setOpeningStocks] = useState<OpeningStock[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [itemStamps, setItemStamps] = useState<ItemStamp[]>([])
  const [itemDesigns, setItemDesigns] = useState<ItemDesign[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OpeningStock | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const stockDateInputRef = useRef<HTMLInputElement | null>(null)
  const itemSelectRef = useRef<HTMLSelectElement | null>(null)
  const stampSelectRef = useRef<HTMLSelectElement | null>(null)
  const designSelectRef = useRef<HTMLSelectElement | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement | null>(null)
  const remarkInputRef = useRef<HTMLInputElement | null>(null)
  const pcsInputRef = useRef<HTMLInputElement | null>(null)
  const grossWeightInputRef = useRef<HTMLInputElement | null>(null)
  const lessWeightInputRef = useRef<HTMLInputElement | null>(null)
  const addWeightInputRef = useRef<HTMLInputElement | null>(null)
  const tanchInputRef = useRef<HTMLInputElement | null>(null)
  const wastageInputRef = useRef<HTMLInputElement | null>(null)
  const hishobInputRef = useRef<HTMLInputElement | null>(null)
  const unitSelectRef = useRef<HTMLSelectElement | null>(null)
  const activeCheckboxRef = useRef<HTMLInputElement | null>(null)

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === form.itemId)
  }, [items, form.itemId])

  const selectedMetalType = selectedItem?.metalType ?? ''

  const activeItems = useMemo(() => {
    return items.filter((item) => item.active)
  }, [items])

  const activeStamps = useMemo(() => {
    if (!selectedMetalType) return []
    return itemStamps.filter((stamp) => stamp.active && stamp.metalType === selectedMetalType)
  }, [itemStamps, selectedMetalType])

  const activeDesigns = useMemo(() => {
    if (!selectedMetalType) return []
    return itemDesigns.filter((design) => design.active && design.metalType === selectedMetalType)
  }, [itemDesigns, selectedMetalType])

  const netWeight = useMemo(() => {
    return calculateNetWeight(form.grossWeight, form.lessWeight, form.addWeight)
  }, [form.grossWeight, form.lessWeight, form.addWeight])

  const fine = useMemo(() => {
    return calculateFine(netWeight, form.tanch, form.wastage)
  }, [netWeight, form.tanch, form.wastage])

  const filteredOpeningStocks = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return openingStocks

    return openingStocks.filter((stock) => {
      return (
        stock.itemName.toLowerCase().includes(keyword) ||
        stock.metalType.toLowerCase().includes(keyword) ||
        stock.stampName.toLowerCase().includes(keyword) ||
        stock.designName.toLowerCase().includes(keyword) ||
        stock.barcode.toLowerCase().includes(keyword) ||
        stock.remark.toLowerCase().includes(keyword)
      )
    })
  }, [openingStocks, searchText])

  const activeCount = useMemo(() => {
    return openingStocks.filter((stock) => stock.active).length
  }, [openingStocks])

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

  const focusNextOnEnter = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    nextElement?.focus()
  }

  const handleDecimalChange = (
    value: string,
    fieldName: 'pcs' | 'grossWeight' | 'lessWeight' | 'addWeight' | 'tanch' | 'wastage' | 'hishob'
  ): void => {
    if (!isValidAmountInput(value)) return

    setForm((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const loadOpeningStocks = useCallback(async (): Promise<void> => {
    const data = await window.api.itemOpeningStock.list()
    setOpeningStocks(data)
  }, [])

  const loadMasters = useCallback(async (): Promise<void> => {
    const [itemsData, stampsData, designsData] = await Promise.all([
      window.api.items.list(),
      window.api.itemStamps.list(),
      window.api.itemDesigns.list()
    ])

    setItems(itemsData)
    setItemStamps(stampsData)
    setItemDesigns(designsData)

    const firstActiveItem = itemsData.find((item) => item.active)

    if (firstActiveItem) {
      setForm((current) => ({
        ...current,
        itemId: firstActiveItem.id,
        stampId: firstActiveItem.defaultStampId,
        designId: firstActiveItem.defaultDesignId
      }))
    }
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await loadMasters()
      await loadOpeningStocks()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadMasters, loadOpeningStocks, showAlert])

  const handleNew = useCallback((): void => {
    const firstActiveItem = activeItems[0]

    setEditingId(null)
    setAlertMessage('')
    setForm({
      ...initialForm,
      stockDate: getTodayDate(),
      itemId: firstActiveItem?.id ?? '',
      stampId: firstActiveItem?.defaultStampId ?? '',
      designId: firstActiveItem?.defaultDesignId ?? ''
    })

    window.setTimeout(() => {
      stockDateInputRef.current?.focus()
    }, 0)
  }, [activeItems])

  const handleItemChange = (itemId: string): void => {
    const item = items.find((currentItem) => currentItem.id === itemId)

    setForm((current) => ({
      ...current,
      itemId,
      stampId: item?.defaultStampId ?? '',
      designId: item?.defaultDesignId ?? ''
    }))
  }

  const validateForm = useCallback((): boolean => {
    if (!form.itemId) {
      showAlert('warning', 'Please select item.')
      itemSelectRef.current?.focus()
      return false
    }

    if (toNumber(form.grossWeight) <= 0 && toNumber(form.pcs) <= 0) {
      showAlert('warning', 'Please enter gross weight or pcs.')
      grossWeightInputRef.current?.focus()
      return false
    }

    if (netWeight < 0) {
      showAlert('warning', 'Net weight cannot be negative.')
      grossWeightInputRef.current?.focus()
      return false
    }

    return true
  }, [form.grossWeight, form.itemId, form.pcs, netWeight, showAlert])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      const payload = {
        stockDate: form.stockDate || getTodayDate(),
        itemId: form.itemId,
        stampId: form.stampId,
        designId: form.designId,
        barcode: form.barcode.trim(),
        remark: form.remark.trim(),
        pcs: toNumber(form.pcs),
        grossWeight: toNumber(form.grossWeight),
        lessWeight: toNumber(form.lessWeight),
        addWeight: toNumber(form.addWeight),
        tanch: toNumber(form.tanch),
        wastage: toNumber(form.wastage),
        hishob: toNumber(form.hishob),
        unit: form.unit,
        active: form.active
      }

      const successMessage = editingId
        ? 'Opening stock updated successfully.'
        : 'Opening stock saved successfully.'

      if (editingId) {
        await window.api.itemOpeningStock.update(editingId, payload)
      } else {
        await window.api.itemOpeningStock.create(payload)
      }

      await loadOpeningStocks()
      handleNew()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, form, handleNew, loadOpeningStocks, saving, showAlert, validateForm])

  const handleEdit = (stock: OpeningStock): void => {
    setEditingId(stock.id)
    setAlertMessage('')

    setForm({
      stockDate: stock.stockDate,
      itemId: stock.itemId,
      stampId: stock.stampId,
      designId: stock.designId,
      barcode: stock.barcode,
      remark: stock.remark,
      pcs: stock.pcs === 0 ? '' : String(stock.pcs),
      grossWeight: stock.grossWeight === 0 ? '' : String(stock.grossWeight),
      lessWeight: stock.lessWeight === 0 ? '' : String(stock.lessWeight),
      addWeight: stock.addWeight === 0 ? '' : String(stock.addWeight),
      tanch: stock.tanch === 0 ? '' : String(stock.tanch),
      wastage: stock.wastage === 0 ? '' : String(stock.wastage),
      hishob: stock.hishob === 0 ? '' : String(stock.hishob),
      unit: stock.unit || 'GM',
      active: stock.active
    })

    window.setTimeout(() => {
      stockDateInputRef.current?.focus()
    }, 0)
  }

  const requestDelete = (stock: OpeningStock): void => {
    setDeleteTarget(stock)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.itemOpeningStock.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        handleNew()
      }

      setDeleteTarget(null)
      await loadOpeningStocks()
      showAlert('success', 'Opening stock deleted successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = useCallback((): void => {
    if (deleting) return
    setDeleteTarget(null)
  }, [deleting])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadInitialData()
      stockDateInputRef.current?.focus()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadInitialData])

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        handleNew()
      }

      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave()
      }

      if (event.key === 'Escape') {
        if (deleteTarget) {
          handleCancelDelete()
          return
        }

        if (editingId) {
          handleNew()
        }
      }
    }

    window.addEventListener('keydown', handleKeyboard)

    return () => {
      window.removeEventListener('keydown', handleKeyboard)
    }
  }, [deleteTarget, editingId, handleCancelDelete, handleNew, handleSave])

  return (
    <div className="item-opening-stock-screen">
      <div className="item-opening-stock-window">
        <div className="form-title-bar">
          <span>Item Opening Stock</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="item-opening-stock-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="opening-stock-form-panel">
            <div className="section-title">Stock Details</div>

            <div className="opening-stock-grid">
              <div className="form-field">
                <label htmlFor="opening-stock-date">Date</label>
                <input
                  id="opening-stock-date"
                  ref={stockDateInputRef}
                  type="date"
                  value={form.stockDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stockDate: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, itemSelectRef.current)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-item">Item Name</label>
                <select
                  id="opening-stock-item"
                  ref={itemSelectRef}
                  value={form.itemId}
                  onChange={(event) => handleItemChange(event.target.value)}
                  onKeyDown={(event) => focusNextOnEnter(event, stampSelectRef.current)}
                >
                  <option value="">Select Item</option>
                  {activeItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemName} - {item.metalType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-metal">Metal</label>
                <input id="opening-stock-metal" value={selectedMetalType || '-'} disabled />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-stamp">Stamp</label>
                <select
                  id="opening-stock-stamp"
                  ref={stampSelectRef}
                  value={form.stampId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stampId: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, designSelectRef.current)}
                >
                  <option value="">Select Stamp</option>
                  {activeStamps.map((stamp) => (
                    <option key={stamp.id} value={stamp.id}>
                      {stamp.stampName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-design">Design</label>
                <select
                  id="opening-stock-design"
                  ref={designSelectRef}
                  value={form.designId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      designId: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, barcodeInputRef.current)}
                >
                  <option value="">Select Design</option>
                  {activeDesigns.map((design) => (
                    <option key={design.id} value={design.id}>
                      {design.designName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-barcode">Barcode</label>
                <input
                  id="opening-stock-barcode"
                  ref={barcodeInputRef}
                  value={form.barcode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      barcode: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, remarkInputRef.current)}
                  placeholder="Optional"
                />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-remark">Remark</label>
                <input
                  id="opening-stock-remark"
                  ref={remarkInputRef}
                  value={form.remark}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      remark: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, pcsInputRef.current)}
                  placeholder="Optional"
                />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-pcs">Pcs</label>
                <input
                  id="opening-stock-pcs"
                  ref={pcsInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.pcs}
                  onChange={(event) => handleDecimalChange(event.target.value, 'pcs')}
                  onKeyDown={(event) => focusNextOnEnter(event, grossWeightInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-gross-weight">Gr. Wt.</label>
                <input
                  id="opening-stock-gross-weight"
                  ref={grossWeightInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.grossWeight}
                  onChange={(event) => handleDecimalChange(event.target.value, 'grossWeight')}
                  onKeyDown={(event) => focusNextOnEnter(event, lessWeightInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-less-weight">Less Wt.</label>
                <input
                  id="opening-stock-less-weight"
                  ref={lessWeightInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.lessWeight}
                  onChange={(event) => handleDecimalChange(event.target.value, 'lessWeight')}
                  onKeyDown={(event) => focusNextOnEnter(event, addWeightInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-add-weight">Add Wt.</label>
                <input
                  id="opening-stock-add-weight"
                  ref={addWeightInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.addWeight}
                  onChange={(event) => handleDecimalChange(event.target.value, 'addWeight')}
                  onKeyDown={(event) => focusNextOnEnter(event, tanchInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field readonly-field">
                <label htmlFor="opening-stock-net-weight">Net Wt.</label>
                <input id="opening-stock-net-weight" value={netWeight} disabled />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-tanch">Tanch</label>
                <input
                  id="opening-stock-tanch"
                  ref={tanchInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.tanch}
                  onChange={(event) => handleDecimalChange(event.target.value, 'tanch')}
                  onKeyDown={(event) => focusNextOnEnter(event, wastageInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-wastage">Wastage</label>
                <input
                  id="opening-stock-wastage"
                  ref={wastageInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.wastage}
                  onChange={(event) => handleDecimalChange(event.target.value, 'wastage')}
                  onKeyDown={(event) => focusNextOnEnter(event, hishobInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-hishob">Hishob</label>
                <input
                  id="opening-stock-hishob"
                  ref={hishobInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.hishob}
                  onChange={(event) => handleDecimalChange(event.target.value, 'hishob')}
                  onKeyDown={(event) => focusNextOnEnter(event, unitSelectRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="opening-stock-unit">Unit</label>
                <select
                  id="opening-stock-unit"
                  ref={unitSelectRef}
                  value={form.unit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      unit: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, activeCheckboxRef.current)}
                >
                  <option>GM</option>
                  <option>KG</option>
                  <option>PCS</option>
                </select>
              </div>

              <div className="form-field readonly-field">
                <label htmlFor="opening-stock-fine">Fine</label>
                <input id="opening-stock-fine" value={fine} disabled />
              </div>

              <div className="form-field active-field">
                <label htmlFor="opening-stock-active">Active</label>
                <input
                  id="opening-stock-active"
                  ref={activeCheckboxRef}
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.checked
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void handleSave()
                    }
                  }}
                />
              </div>
            </div>

            <div className="button-row opening-stock-button-row">
              <button className="btn-new" type="button" onClick={handleNew} disabled={saving}>
                New
              </button>

              <button
                className="btn-save"
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
              </button>

              {editingId && (
                <button
                  className="btn-cancel-edit"
                  type="button"
                  onClick={handleNew}
                  disabled={saving}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div className="list-toolbar">
            <div className="list-search">
              <label htmlFor="opening-stock-search">Search</label>

              <input
                id="opening-stock-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search item, metal, stamp, design, barcode"
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

            <div className="record-summary">
              Total: <strong>{openingStocks.length}</strong> | Active:{' '}
              <strong>{activeCount}</strong> | Showing:{' '}
              <strong>{filteredOpeningStocks.length}</strong>
            </div>
          </div>

          <div className="table-panel opening-stock-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Metal</th>
                  <th>Stamp</th>
                  <th>Design</th>
                  <th>Pcs</th>
                  <th>Gr. Wt.</th>
                  <th>Less</th>
                  <th>Add</th>
                  <th>Net</th>
                  <th>Tanch</th>
                  <th>Wstg</th>
                  <th>Fine</th>
                  <th>Unit</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={17} className="empty-row">
                      Loading opening stock...
                    </td>
                  </tr>
                ) : filteredOpeningStocks.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="empty-row">
                      {searchText
                        ? 'No matching opening stock found.'
                        : 'No opening stock added yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredOpeningStocks.map((stock, index) => (
                    <tr
                      key={stock.id}
                      className={editingId === stock.id ? 'selected-row' : ''}
                      onDoubleClick={() => handleEdit(stock)}
                    >
                      <td>{index + 1}</td>
                      <td>{stock.stockDate}</td>
                      <td>{stock.itemName}</td>
                      <td>{stock.metalType}</td>
                      <td>{stock.stampName || '-'}</td>
                      <td>{stock.designName || '-'}</td>
                      <td>{stock.pcs}</td>
                      <td>{stock.grossWeight}</td>
                      <td>{stock.lessWeight}</td>
                      <td>{stock.addWeight}</td>
                      <td>{stock.netWeight}</td>
                      <td>{stock.tanch}</td>
                      <td>{stock.wastage}</td>
                      <td>{stock.fine}</td>
                      <td>{stock.unit}</td>
                      <td>
                        <span className={stock.active ? 'status-active' : 'status-inactive'}>
                          {stock.active ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-edit"
                          type="button"
                          onClick={() => handleEdit(stock)}
                        >
                          Edit
                        </button>

                        <button
                          className="table-delete"
                          type="button"
                          onClick={() => requestDelete(stock)}
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
            Formula: Net Weight = Gross Weight - Less Weight + Add Weight. Fine = Net Weight x
            (Tanch + Wastage) / 100.
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Opening Stock?"
        message={
          deleteTarget
            ? `Are you sure you want to delete opening stock for "${deleteTarget.itemName}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default ItemOpeningStockScreen
