import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import {
  calculateFine,
  calculateHishob,
  calculateMajuri,
  calculateNetWeight
} from '../../../utils/jewelleryFormula'

type AlertType = 'success' | 'error' | 'warning'
type UnitType = 'Kg' | 'Gm' | 'Pcs'
type MetalType = 'Gold' | 'Silver'

type ItemOption = {
  id: string
  itemName: string
  metalType: string
  defaultStampId: string
  defaultDesignId: string
  defaultTanch: number
  defaultWastage: number
  defaultLabourRate: number
  labourRateType: string
  active: boolean
}

type StampOption = {
  id: string
  stampName: string
  metalType: string
  active: boolean
}

type DesignOption = {
  id: string
  designName: string
  metalType: string
  active: boolean
}

type OpeningStockRecord = {
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
  unit: UnitType
  majuriRate: number
  fine: number
  majuri: number
  active: boolean
}

type DraftLine = {
  lineNo: number
  stockDate: string
  metalType: MetalType
  stampId: string
  stampName: string
  itemId: string
  itemName: string
  designId: string
  designName: string
  pcs: number
  grossWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  tanch: number
  wastage: number
  hishob: number
  unit: UnitType
  majuriRate: number
  fine: number
  majuri: number
  barcode: string
  remark: string
  active: boolean
}

const today = new Date().toISOString().slice(0, 10)

const initialForm = {
  stockDate: today,
  metalType: 'Silver' as MetalType,
  stampId: '',
  itemId: '',
  designId: '',
  pcs: '',
  grossWeight: '',
  lessWeight: '',
  addWeight: '',
  tanch: '',
  wastage: '',
  unit: 'Kg' as UnitType,
  majuriRate: '',
  barcode: '',
  remark: '',
  active: true
}

function toNumber(value: string | number): number {
  if (value === '') return 0

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function isValidAmountInput(value: string): boolean {
  return /^-?\d*\.?\d*$/.test(value)
}

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatDate(value: string): string {
  if (!value) return '-'

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function normalizeUnit(value: string): UnitType {
  const normalized = String(value || 'Kg')
    .trim()
    .toUpperCase()

  if (normalized === 'GM') return 'Gm'
  if (normalized === 'PCS') return 'Pcs'

  return 'Kg'
}

function normalizeMetal(value: string): MetalType {
  return value === 'Gold' ? 'Gold' : 'Silver'
}

function ItemOpeningStockScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [items, setItems] = useState<ItemOption[]>([])
  const [stamps, setStamps] = useState<StampOption[]>([])
  const [designs, setDesigns] = useState<DesignOption[]>([])
  const [savedRecords, setSavedRecords] = useState<OpeningStockRecord[]>([])
  const [draftLines, setDraftLines] = useState<DraftLine[]>([])
  const [selectedDraftLineNo, setSelectedDraftLineNo] = useState<number | null>(null)
  const [recordToDelete, setRecordToDelete] = useState<OpeningStockRecord | null>(null)
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const itemSelectRef = useRef<HTMLSelectElement | null>(null)

  const filteredItems = useMemo(() => {
    return items.filter((item) => item.metalType === form.metalType && item.active)
  }, [items, form.metalType])

  const filteredStamps = useMemo(() => {
    return stamps.filter((stamp) => stamp.metalType === form.metalType && stamp.active)
  }, [stamps, form.metalType])

  const filteredDesigns = useMemo(() => {
    return designs.filter((design) => design.metalType === form.metalType && design.active)
  }, [designs, form.metalType])

  const preview = useMemo(() => {
    const netWeight = calculateNetWeight(
      toNumber(form.grossWeight),
      toNumber(form.lessWeight),
      toNumber(form.addWeight)
    )
    const hishob = calculateHishob(toNumber(form.tanch), toNumber(form.wastage))
    const fine = calculateFine(netWeight, toNumber(form.tanch), toNumber(form.wastage))
    const majuri = calculateMajuri({
      netWeight,
      pcs: toNumber(form.pcs),
      labourRate: toNumber(form.majuriRate),
      labourRateType: form.unit
    })

    return {
      netWeight,
      hishob,
      fine,
      majuri
    }
  }, [form])

  const filteredSavedRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return savedRecords.filter((record) => {
      return (
        !keyword ||
        record.itemName.toLowerCase().includes(keyword) ||
        record.metalType.toLowerCase().includes(keyword) ||
        record.stampName.toLowerCase().includes(keyword) ||
        record.designName.toLowerCase().includes(keyword) ||
        record.barcode.toLowerCase().includes(keyword)
      )
    })
  }, [savedRecords, searchText])

  const draftTotals = useMemo(() => {
    return draftLines.reduce(
      (total, line) => {
        const bucket = line.metalType === 'Gold' ? total.gold : total.silver

        bucket.pcs += Number(line.pcs || 0)
        bucket.grossWeight += Number(line.grossWeight || 0)
        bucket.netWeight += Number(line.netWeight || 0)
        bucket.fine += Number(line.fine || 0)
        bucket.majuri += Number(line.majuri || 0)

        return total
      },
      {
        gold: {
          pcs: 0,
          grossWeight: 0,
          netWeight: 0,
          fine: 0,
          majuri: 0
        },
        silver: {
          pcs: 0,
          grossWeight: 0,
          netWeight: 0,
          fine: 0,
          majuri: 0
        }
      }
    )
  }, [draftLines])

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

      const [itemData, stampData, designData, openingData] = await Promise.all([
        window.api.items.list(),
        window.api.itemStamps.list(),
        window.api.itemDesigns.list(),
        window.api.itemOpeningStock.list()
      ])

      setItems(itemData)
      setStamps(stampData)
      setDesigns(designData)
      setSavedRecords(openingData)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const updateForm = (field: keyof typeof initialForm, value: string | boolean): void => {
    setForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const updateAmountField = (
    field: 'pcs' | 'grossWeight' | 'lessWeight' | 'addWeight' | 'tanch' | 'wastage' | 'majuriRate',
    value: string
  ): void => {
    if (!isValidAmountInput(value)) return
    updateForm(field, value)
  }

  const handleMetalChange = (metalType: string): void => {
    setForm((current) => ({
      ...current,
      metalType: normalizeMetal(metalType),
      stampId: '',
      itemId: '',
      designId: '',
      pcs: '',
      grossWeight: '',
      lessWeight: '',
      addWeight: '',
      tanch: '',
      wastage: '',
      majuriRate: '',
      unit: 'Kg'
    }))
  }

  const handleItemChange = (itemId: string): void => {
    const item = items.find((entry) => entry.id === itemId)

    setForm((current) => ({
      ...current,
      itemId,
      stampId: item?.defaultStampId || current.stampId || '',
      designId: item?.defaultDesignId || current.designId || '',
      lessWeight: '',
      tanch: item?.defaultTanch ? String(item.defaultTanch) : current.tanch,
      wastage: item?.defaultWastage ? String(item.defaultWastage) : current.wastage,
      majuriRate: item?.defaultLabourRate ? String(item.defaultLabourRate) : current.majuriRate,
      unit: normalizeUnit(item?.labourRateType || current.unit || 'Kg')
    }))
  }

  const resetLineForm = useCallback((): void => {
    setForm((current) => ({
      ...initialForm,
      stockDate: current.stockDate,
      metalType: current.metalType
    }))
    setSelectedDraftLineNo(null)

    window.setTimeout(() => {
      itemSelectRef.current?.focus()
    }, 0)
  }, [])

  const addDraftLine = (): void => {
    if (!form.itemId) {
      showAlert('warning', 'Please select item name.')
      itemSelectRef.current?.focus()
      return
    }

    if (toNumber(form.grossWeight) <= 0) {
      showAlert('warning', 'Please enter gross weight.')
      return
    }

    const item = items.find((entry) => entry.id === form.itemId)
    const stamp = stamps.find((entry) => entry.id === form.stampId)
    const design = designs.find((entry) => entry.id === form.designId)

    if (!item) {
      showAlert('warning', 'Selected item not found.')
      return
    }

    const line: DraftLine = {
      lineNo: draftLines.length + 1,
      stockDate: form.stockDate,
      metalType: form.metalType,
      stampId: form.stampId,
      stampName: stamp?.stampName || '',
      itemId: form.itemId,
      itemName: item.itemName,
      designId: form.designId,
      designName: design?.designName || '',
      pcs: toNumber(form.pcs),
      grossWeight: toNumber(form.grossWeight),
      lessWeight: toNumber(form.lessWeight),
      addWeight: toNumber(form.addWeight),
      netWeight: preview.netWeight,
      tanch: toNumber(form.tanch),
      wastage: toNumber(form.wastage),
      hishob: preview.hishob,
      unit: form.unit,
      majuriRate: toNumber(form.majuriRate),
      fine: preview.fine,
      majuri: preview.majuri,
      barcode: form.barcode.trim(),
      remark: form.remark.trim(),
      active: form.active
    }

    setDraftLines((current) => [...current, line])
    resetLineForm()
  }

  const removeSelectedDraftLine = (): void => {
    if (!selectedDraftLineNo) {
      showAlert('warning', 'Please select a line to remove.')
      return
    }

    setDraftLines((current) =>
      current
        .filter((line) => line.lineNo !== selectedDraftLineNo)
        .map((line, index) => ({
          ...line,
          lineNo: index + 1
        }))
    )
    setSelectedDraftLineNo(null)
  }

  const saveOpeningStock = async (): Promise<void> => {
    if (draftLines.length === 0) {
      showAlert('warning', 'Please add at least one opening stock line.')
      return
    }

    try {
      setSaving(true)

      for (const line of draftLines) {
        await window.api.itemOpeningStock.create({
          stockDate: line.stockDate,
          itemId: line.itemId,
          stampId: line.stampId,
          designId: line.designId,
          barcode: line.barcode,
          remark: line.remark,
          pcs: line.pcs,
          grossWeight: line.grossWeight,
          lessWeight: line.lessWeight,
          addWeight: line.addWeight,
          tanch: line.tanch,
          wastage: line.wastage,
          hishob: line.hishob,
          unit: line.unit,
          majuriRate: line.majuriRate,
          active: line.active
        })
      }

      showAlert('success', 'Item opening stock saved successfully.')
      setDraftLines([])
      setSelectedDraftLineNo(null)
      await loadData()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const deleteSavedRecord = async (): Promise<void> => {
    if (!recordToDelete) return

    try {
      setDeleting(true)

      await window.api.itemOpeningStock.remove(recordToDelete.id)

      showAlert('success', 'Opening stock deleted successfully.')
      setRecordToDelete(null)
      await loadData()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => {
      window.clearTimeout(timer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadData])

  return (
    <div className="item-opening-stock-screen">
      <div className="item-opening-stock-window item-opening-stock-client-window">
        <div className="form-title-bar">
          <span>Item Opening Stock</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="item-opening-stock-body item-opening-stock-client-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="opening-entry-panel">
            <div className="opening-entry-grid first-row">
              <div className="form-field">
                <label>Gold / Silver</label>
                <select
                  value={form.metalType}
                  onChange={(event) => handleMetalChange(event.target.value)}
                >
                  <option value="Gold">GOLD</option>
                  <option value="Silver">SILVER</option>
                </select>
              </div>

              <div className="form-field">
                <label>Stamp</label>
                <select
                  value={form.stampId}
                  onChange={(event) => updateForm('stampId', event.target.value)}
                >
                  <option value="">Select Stamp</option>
                  {filteredStamps.map((stamp) => (
                    <option key={stamp.id} value={stamp.id}>
                      {stamp.stampName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field item-name-wide">
                <label>Item Name</label>
                <select
                  ref={itemSelectRef}
                  value={form.itemId}
                  onChange={(event) => handleItemChange(event.target.value)}
                >
                  <option value="">Select Item</option>
                  {filteredItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field item-design-wide">
                <label>Item Design</label>
                <select
                  value={form.designId}
                  onChange={(event) => updateForm('designId', event.target.value)}
                >
                  <option value="">Select Design</option>
                  {filteredDesigns.map((design) => (
                    <option key={design.id} value={design.id}>
                      {design.designName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="opening-entry-grid second-row">
              <div className="form-field">
                <label>Pcs</label>
                <input
                  value={form.pcs}
                  onChange={(event) => updateAmountField('pcs', event.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Gr. Wt.</label>
                <input
                  value={form.grossWeight}
                  onChange={(event) => updateAmountField('grossWeight', event.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Less Wt.</label>
                <input
                  value={form.lessWeight}
                  onChange={(event) => updateAmountField('lessWeight', event.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Net Wt.</label>
                <input value={formatNumber(preview.netWeight)} readOnly />
              </div>

              <div className="form-field">
                <label>Tanch</label>
                <input
                  value={form.tanch}
                  onChange={(event) => updateAmountField('tanch', event.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Wstg</label>
                <input
                  value={form.wastage}
                  onChange={(event) => updateAmountField('wastage', event.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Unit</label>
                <select
                  value={form.unit}
                  onChange={(event) => updateForm('unit', normalizeUnit(event.target.value))}
                >
                  <option value="Kg">Kg</option>
                  <option value="Gm">Gm</option>
                  <option value="Pcs">Pcs</option>
                </select>
              </div>

              <div className="form-field">
                <label>Majuri Rate</label>
                <input
                  value={form.majuriRate}
                  onChange={(event) => updateAmountField('majuriRate', event.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Fine</label>
                <input value={formatNumber(preview.fine)} readOnly />
              </div>

              <div className="form-field">
                <label>Majuri</label>
                <input value={formatNumber(preview.majuri)} readOnly />
              </div>

              <button className="opening-add-btn" type="button" onClick={addDraftLine}>
                Add
              </button>

              <button
                className="opening-remove-btn"
                type="button"
                onClick={removeSelectedDraftLine}
              >
                Remove
              </button>
            </div>

            <div className="opening-extra-grid">
              <div className="form-field">
                <label>Date</label>
                <input
                  type="date"
                  value={form.stockDate}
                  onChange={(event) => updateForm('stockDate', event.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Barcode</label>
                <input
                  value={form.barcode}
                  onChange={(event) => updateForm('barcode', event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="form-field opening-remark-field">
                <label>Remark</label>
                <input
                  value={form.remark}
                  onChange={(event) => updateForm('remark', event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="form-field active-field">
                <label>Active</label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updateForm('active', event.target.checked)}
                />
              </div>
            </div>
          </div>

          <div className="table-panel opening-draft-table-panel">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>G/S</th>
                  <th>Stamp</th>
                  <th>Item</th>
                  <th>Item Design</th>
                  <th>Pcs</th>
                  <th>Gr. Wt.</th>
                  <th>Less Wt.</th>
                  <th>Net Wt.</th>
                  <th>Tanch</th>
                  <th>Wstg</th>
                  <th>Unit</th>
                  <th>M. Rate</th>
                  <th>Fine</th>
                  <th>Majuri</th>
                </tr>
              </thead>

              <tbody>
                {draftLines.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="empty-row">
                      No opening stock line added yet.
                    </td>
                  </tr>
                ) : (
                  draftLines.map((line) => (
                    <tr
                      key={line.lineNo}
                      className={selectedDraftLineNo === line.lineNo ? 'selected-row' : ''}
                      onClick={() => setSelectedDraftLineNo(line.lineNo)}
                    >
                      <td>{line.lineNo}</td>
                      <td>{line.metalType.toUpperCase()}</td>
                      <td>{line.stampName || '-'}</td>
                      <td>{line.itemName}</td>
                      <td>{line.designName || '-'}</td>
                      <td>{formatNumber(line.pcs)}</td>
                      <td>{formatNumber(line.grossWeight)}</td>
                      <td>{formatNumber(line.lessWeight)}</td>
                      <td>{formatNumber(line.netWeight)}</td>
                      <td>{formatNumber(line.tanch)}</td>
                      <td>{formatNumber(line.wastage)}</td>
                      <td>{line.unit}</td>
                      <td>{formatNumber(line.majuriRate)}</td>
                      <td>{formatNumber(line.fine)}</td>
                      <td>{formatNumber(line.majuri)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="opening-summary-row">
            <div className="opening-summary-card">
              <h4>Gold</h4>
              <span>Pcs : {formatNumber(draftTotals.gold.pcs)}</span>
              <span>Gr : {formatNumber(draftTotals.gold.grossWeight)}</span>
              <span>Net : {formatNumber(draftTotals.gold.netWeight)}</span>
              <span>
                F : <strong>{formatNumber(draftTotals.gold.fine)}</strong>
              </span>
              <span>
                M : <strong>{formatNumber(draftTotals.gold.majuri)}</strong>
              </span>
            </div>

            <div className="opening-summary-card">
              <h4>Silver</h4>
              <span>Pcs : {formatNumber(draftTotals.silver.pcs)}</span>
              <span>Gr : {formatNumber(draftTotals.silver.grossWeight)}</span>
              <span>Net : {formatNumber(draftTotals.silver.netWeight)}</span>
              <span>
                F : <strong>{formatNumber(draftTotals.silver.fine)}</strong>
              </span>
              <span>
                M : <strong>{formatNumber(draftTotals.silver.majuri)}</strong>
              </span>
            </div>
          </div>

          <div className="opening-save-row">
            <button
              className="btn-save"
              type="button"
              onClick={() => void saveOpeningStock()}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>

            <button
              className="btn-cancel-edit"
              type="button"
              onClick={() => {
                setDraftLines([])
                resetLineForm()
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>

          <div className="opening-saved-panel">
            <div className="opening-saved-toolbar">
              <div className="list-search">
                <label>Saved Opening Stock</label>
                <input
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
                Total: <strong>{savedRecords.length}</strong> | Showing:{' '}
                <strong>{filteredSavedRecords.length}</strong>
              </div>
            </div>

            <div className="table-panel opening-saved-table-panel">
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
                    <th>Net</th>
                    <th>Tanch</th>
                    <th>Wstg</th>
                    <th>Fine</th>
                    <th>M. Rate</th>
                    <th>Majuri</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={16} className="empty-row">
                        Loading opening stock...
                      </td>
                    </tr>
                  ) : filteredSavedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="empty-row">
                        No saved opening stock found.
                      </td>
                    </tr>
                  ) : (
                    filteredSavedRecords.map((record, index) => (
                      <tr key={record.id}>
                        <td>{index + 1}</td>
                        <td>{formatDate(record.stockDate)}</td>
                        <td>{record.itemName}</td>
                        <td>{record.metalType}</td>
                        <td>{record.stampName || '-'}</td>
                        <td>{record.designName || '-'}</td>
                        <td>{formatNumber(record.pcs)}</td>
                        <td>{formatNumber(record.grossWeight)}</td>
                        <td>{formatNumber(record.lessWeight)}</td>
                        <td>{formatNumber(record.netWeight)}</td>
                        <td>{formatNumber(record.tanch)}</td>
                        <td>{formatNumber(record.wastage)}</td>
                        <td>{formatNumber(record.fine)}</td>
                        <td>{formatNumber(record.majuriRate)}</td>
                        <td>{formatNumber(record.majuri)}</td>
                        <td>
                          <button
                            className="btn-delete-small"
                            type="button"
                            onClick={() => setRecordToDelete(record)}
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
          </div>

          <div className="screen-help-text">
            Formula: Net Weight = Gross Weight - Less Weight + Add Weight. Fine = Net Weight x
            (Tanch + Wastage) / 100. Majuri depends on Kg/Gm/Pcs unit.
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(recordToDelete)}
        title="Delete Opening Stock?"
        message={
          recordToDelete
            ? `Opening stock for "${recordToDelete.itemName}" will be removed from stock ledger.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void deleteSavedRecord()}
        onCancel={() => {
          if (!deleting) {
            setRecordToDelete(null)
          }
        }}
      />
    </div>
  )
}

export default ItemOpeningStockScreen
