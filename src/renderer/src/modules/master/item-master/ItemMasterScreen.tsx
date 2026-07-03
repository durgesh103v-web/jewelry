import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type ItemGroup = {
  id: string
  groupName: string
  metalType: string
  description: string
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
  defaultTanch: number
  defaultWastage: number
  defaultLabourRate: number
  labourRateType: string
  active: boolean
}

const initialForm = {
  itemName: '',
  metalType: 'Silver',
  itemGroupId: '',
  defaultStampId: '',
  defaultDesignId: '',
  barcodeItem: false,
  barcodeType: '',
  labourChargesBy: 'Weight',
  salePurchaseBy: 'Weight',
  gstHsnCode: '',
  fixedWeightPerPcs: '',
  defaultTanch: '',
  defaultWastage: '',
  defaultLabourRate: '',
  labourRateType: 'Kg',
  active: true
}

function toNumber(value: string | number): number {
  if (value === '') return 0

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function isValidAmountInput(value: string): boolean {
  return /^\d*\.?\d*$/.test(value)
}

function formatOptionalNumber(value: number): string {
  return value === 0 ? '' : String(value)
}

function calculateHishob(tunch: number, wastage: number): number {
  return Number((tunch + wastage).toFixed(3))
}

function ItemMasterScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [items, setItems] = useState<Item[]>([])
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([])
  const [itemStamps, setItemStamps] = useState<ItemStamp[]>([])
  const [itemDesigns, setItemDesigns] = useState<ItemDesign[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const itemNameInputRef = useRef<HTMLInputElement | null>(null)
  const metalTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const itemGroupSelectRef = useRef<HTMLSelectElement | null>(null)
  const stampSelectRef = useRef<HTMLSelectElement | null>(null)
  const designSelectRef = useRef<HTMLSelectElement | null>(null)
  const barcodeCheckboxRef = useRef<HTMLInputElement | null>(null)
  const barcodeTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const labourChargesSelectRef = useRef<HTMLSelectElement | null>(null)
  const salePurchaseSelectRef = useRef<HTMLSelectElement | null>(null)
  const hsnInputRef = useRef<HTMLInputElement | null>(null)
  const packWeightInputRef = useRef<HTMLInputElement | null>(null)
  const tanchInputRef = useRef<HTMLInputElement | null>(null)
  const wastageInputRef = useRef<HTMLInputElement | null>(null)
  const labourRateInputRef = useRef<HTMLInputElement | null>(null)
  const labourRateTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const activeCheckboxRef = useRef<HTMLInputElement | null>(null)

  const activeGroups = useMemo(() => {
    return itemGroups.filter((group) => group.active && group.metalType === form.metalType)
  }, [itemGroups, form.metalType])

  const activeStamps = useMemo(() => {
    return itemStamps.filter((stamp) => stamp.active && stamp.metalType === form.metalType)
  }, [itemStamps, form.metalType])

  const activeDesigns = useMemo(() => {
    return itemDesigns.filter((design) => design.active && design.metalType === form.metalType)
  }, [itemDesigns, form.metalType])

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return items

    return items.filter((item) => {
      return (
        item.itemName.toLowerCase().includes(keyword) ||
        item.metalType.toLowerCase().includes(keyword) ||
        item.groupName.toLowerCase().includes(keyword) ||
        item.stampName.toLowerCase().includes(keyword) ||
        item.designName.toLowerCase().includes(keyword) ||
        item.gstHsnCode.toLowerCase().includes(keyword) ||
        item.labourChargesBy.toLowerCase().includes(keyword) ||
        item.salePurchaseBy.toLowerCase().includes(keyword) ||
        item.labourRateType.toLowerCase().includes(keyword)
      )
    })
  }, [items, searchText])

  const activeCount = useMemo(() => {
    return items.filter((item) => item.active).length
  }, [items])

  const focusItemName = useCallback((): void => {
    window.setTimeout(() => {
      itemNameInputRef.current?.focus()
    }, 0)
  }, [])

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

  const getFirstGroupId = useCallback(
    (metalType: string): string => {
      const firstGroup = itemGroups.find((group) => group.active && group.metalType === metalType)
      return firstGroup?.id ?? ''
    },
    [itemGroups]
  )

  const loadItems = useCallback(async (): Promise<void> => {
    const data = await window.api.items.list()
    setItems(data)
  }, [])

  const handleNew = useCallback((): void => {
    const defaultMetal = 'Silver'

    setEditingId(null)
    setAlertMessage('')
    setForm({
      ...initialForm,
      metalType: defaultMetal,
      itemGroupId: getFirstGroupId(defaultMetal)
    })

    focusItemName()
  }, [focusItemName, getFirstGroupId])

  const handleMetalChange = useCallback(
    (metalType: string): void => {
      const firstGroupId = getFirstGroupId(metalType)

      setForm((current) => ({
        ...current,
        metalType,
        itemGroupId: firstGroupId,
        defaultStampId: '',
        defaultDesignId: ''
      }))
    },
    [getFirstGroupId]
  )

  const validateForm = useCallback((): boolean => {
    if (!form.itemName.trim()) {
      showAlert('warning', 'Please enter item name.')
      itemNameInputRef.current?.focus()
      return false
    }

    if (!form.itemGroupId) {
      showAlert('warning', 'Please select item group.')
      itemGroupSelectRef.current?.focus()
      return false
    }

    return true
  }, [form.itemGroupId, form.itemName, showAlert])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return
    if (!validateForm()) return

    try {
      setSaving(true)

      const payload = {
        itemName: form.itemName.trim(),
        metalType: form.metalType,
        itemGroupId: form.itemGroupId,
        defaultStampId: form.defaultStampId,
        defaultDesignId: form.defaultDesignId,
        barcodeItem: form.barcodeItem,
        barcodeType: form.barcodeItem ? form.barcodeType : '',
        labourChargesBy: form.labourChargesBy,
        salePurchaseBy: form.salePurchaseBy,
        gstHsnCode: form.gstHsnCode.trim(),
        fixedWeightPerPcs: toNumber(form.fixedWeightPerPcs),
        defaultTanch: toNumber(form.defaultTanch),
        defaultWastage: toNumber(form.defaultWastage),
        defaultLabourRate: toNumber(form.defaultLabourRate),
        labourRateType: form.labourRateType,
        active: form.active
      }

      const successMessage = editingId ? 'Item updated successfully.' : 'Item saved successfully.'

      if (editingId) {
        await window.api.items.update(editingId, payload)
      } else {
        await window.api.items.create(payload)
      }

      await loadItems()
      handleNew()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, form, handleNew, loadItems, saving, showAlert, validateForm])

  const handleEdit = (item: Item): void => {
    setEditingId(item.id)
    setAlertMessage('')
    setForm({
      itemName: item.itemName,
      metalType: item.metalType,
      itemGroupId: item.itemGroupId,
      defaultStampId: item.defaultStampId,
      defaultDesignId: item.defaultDesignId,
      barcodeItem: item.barcodeItem,
      barcodeType: item.barcodeType,
      labourChargesBy: item.labourChargesBy,
      salePurchaseBy: item.salePurchaseBy,
      gstHsnCode: item.gstHsnCode,
      fixedWeightPerPcs: item.fixedWeightPerPcs === 0 ? '' : String(item.fixedWeightPerPcs),
      defaultTanch: item.defaultTanch === 0 ? '' : String(item.defaultTanch),
      defaultWastage: item.defaultWastage === 0 ? '' : String(item.defaultWastage),
      defaultLabourRate: item.defaultLabourRate === 0 ? '' : String(item.defaultLabourRate),
      labourRateType: item.labourRateType || 'Kg',
      active: item.active
    })
    focusItemName()
  }

  const requestDelete = (item: Item): void => {
    setDeleteTarget(item)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.items.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        handleNew()
      }

      setDeleteTarget(null)
      await loadItems()
      showAlert('success', 'Item deleted successfully.')
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
    let cancelled = false

    Promise.all([
      window.api.itemGroups.list(),
      window.api.itemStamps.list(),
      window.api.itemDesigns.list(),
      window.api.items.list()
    ])
      .then(([groups, stamps, designs, itemData]) => {
        if (cancelled) return

        setItemGroups(groups)
        setItemStamps(stamps)
        setItemDesigns(designs)
        setItems(itemData)

        const firstSilverGroup = groups.find(
          (group) => group.active && group.metalType === 'Silver'
        )
        if (firstSilverGroup) {
          setForm((current) => ({
            ...current,
            itemGroupId: current.itemGroupId || firstSilverGroup.id
          }))
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    focusItemName()

    return () => {
      cancelled = true

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [focusItemName, showAlert])

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
    <div className="item-master-screen">
      <div className="item-master-window">
        <div className="form-title-bar">
          <span>Item Master</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="item-master-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="item-master-form-panel">
            <div className="section-title">Item Details</div>

            <div className="item-master-grid">
              <div className="form-field">
                <label htmlFor="item-master-name">Item Name</label>
                <input
                  id="item-master-name"
                  ref={itemNameInputRef}
                  value={form.itemName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      itemName: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, metalTypeSelectRef.current)}
                  placeholder="Enter item name"
                />
              </div>

              <div className="form-field">
                <label htmlFor="item-master-metal-type">Metal Type</label>
                <select
                  id="item-master-metal-type"
                  ref={metalTypeSelectRef}
                  value={form.metalType}
                  onChange={(event) => handleMetalChange(event.target.value)}
                  onKeyDown={(event) => focusNextOnEnter(event, itemGroupSelectRef.current)}
                >
                  <option>Gold</option>
                  <option>Silver</option>
                  <option>Diamond</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="item-master-group">Item Group</label>
                <select
                  id="item-master-group"
                  ref={itemGroupSelectRef}
                  value={form.itemGroupId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      itemGroupId: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, stampSelectRef.current)}
                >
                  <option value="">Select Item Group</option>
                  {activeGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.groupName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="item-master-stamp">Default Stamp</label>
                <select
                  id="item-master-stamp"
                  ref={stampSelectRef}
                  value={form.defaultStampId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      defaultStampId: event.target.value
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
                <label htmlFor="item-master-design">Default Design</label>
                <select
                  id="item-master-design"
                  ref={designSelectRef}
                  value={form.defaultDesignId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      defaultDesignId: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, barcodeCheckboxRef.current)}
                >
                  <option value="">Select Design</option>
                  {activeDesigns.map((design) => (
                    <option key={design.id} value={design.id}>
                      {design.designName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field active-field">
                <label htmlFor="item-master-barcode-item">Barcode Item</label>
                <input
                  id="item-master-barcode-item"
                  ref={barcodeCheckboxRef}
                  type="checkbox"
                  checked={form.barcodeItem}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      barcodeItem: event.target.checked
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      packWeightInputRef.current?.focus()
                    }
                  }}
                />
              </div>
            </div>

            <div className="section-title">Sale Calculation Defaults</div>

            <div className="item-master-grid">
              <div className="form-field">
                <label htmlFor="item-master-pack-weight">Product / Pack Wt.</label>
                <input
                  id="item-master-pack-weight"
                  ref={packWeightInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.fixedWeightPerPcs}
                  onChange={(event) => {
                    const value = event.target.value

                    if (isValidAmountInput(value)) {
                      setForm((current) => ({
                        ...current,
                        fixedWeightPerPcs: value
                      }))
                    }
                  }}
                  onKeyDown={(event) => focusNextOnEnter(event, tanchInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="item-master-default-tanch">Default Tunch</label>
                <input
                  id="item-master-default-tanch"
                  ref={tanchInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.defaultTanch}
                  onChange={(event) => {
                    const value = event.target.value

                    if (isValidAmountInput(value)) {
                      setForm((current) => ({
                        ...current,
                        defaultTanch: value
                      }))
                    }
                  }}
                  onKeyDown={(event) => focusNextOnEnter(event, wastageInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="item-master-default-wastage">Default Wastage</label>
                <input
                  id="item-master-default-wastage"
                  ref={wastageInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.defaultWastage}
                  onChange={(event) => {
                    const value = event.target.value

                    if (isValidAmountInput(value)) {
                      setForm((current) => ({
                        ...current,
                        defaultWastage: value
                      }))
                    }
                  }}
                  onKeyDown={(event) => focusNextOnEnter(event, labourRateInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="item-master-default-labour-rate">Labour Rate</label>
                <input
                  id="item-master-default-labour-rate"
                  ref={labourRateInputRef}
                  type="text"
                  inputMode="decimal"
                  value={form.defaultLabourRate}
                  onChange={(event) => {
                    const value = event.target.value

                    if (isValidAmountInput(value)) {
                      setForm((current) => ({
                        ...current,
                        defaultLabourRate: value
                      }))
                    }
                  }}
                  onKeyDown={(event) => focusNextOnEnter(event, labourRateTypeSelectRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label htmlFor="item-master-labour-rate-type">Labour Rate Type</label>
                <select
                  id="item-master-labour-rate-type"
                  ref={labourRateTypeSelectRef}
                  value={form.labourRateType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      labourRateType: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, barcodeTypeSelectRef.current)}
                >
                  <option>Kg</option>
                  <option>Gm</option>
                  <option>Pcs</option>
                </select>
              </div>

              <div className="formula-preview">
                <strong>Sale Formula</strong>
                <span>L.Wt = Pack Wt x Pcs</span>
                <span>Hishob = Tunch + Wastage</span>
                <span>Fine = Net Wt x Hishob / 100</span>
              </div>
            </div>

            <div className="section-title">Billing Settings</div>

            <div className="item-master-grid">
              <div className="form-field">
                <label htmlFor="item-master-barcode-type">Barcode Type</label>
                <select
                  id="item-master-barcode-type"
                  ref={barcodeTypeSelectRef}
                  value={form.barcodeType}
                  disabled={!form.barcodeItem}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      barcodeType: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, labourChargesSelectRef.current)}
                >
                  <option value="">None</option>
                  <option>Auto</option>
                  <option>Manual</option>
                  <option>Weight Wise</option>
                  <option>Pcs Wise</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="item-master-labour-charges-by">Labour Charges By</label>
                <select
                  id="item-master-labour-charges-by"
                  ref={labourChargesSelectRef}
                  value={form.labourChargesBy}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      labourChargesBy: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, salePurchaseSelectRef.current)}
                >
                  <option>Weight</option>
                  <option>Pcs</option>
                  <option>Fixed</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="item-master-sale-purchase-by">Sale/Purchase By</label>
                <select
                  id="item-master-sale-purchase-by"
                  ref={salePurchaseSelectRef}
                  value={form.salePurchaseBy}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      salePurchaseBy: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, hsnInputRef.current)}
                >
                  <option>Weight</option>
                  <option>Pcs</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="item-master-hsn">GST HSN Code</label>
                <input
                  id="item-master-hsn"
                  ref={hsnInputRef}
                  value={form.gstHsnCode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gstHsnCode: event.target.value
                    }))
                  }
                  onKeyDown={(event) => focusNextOnEnter(event, activeCheckboxRef.current)}
                  placeholder="Optional"
                />
              </div>

              <div className="form-field active-field">
                <label htmlFor="item-master-active">Active</label>
                <input
                  id="item-master-active"
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

            <div className="button-row item-master-button-row">
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
              <label htmlFor="item-master-search">Search</label>

              <input
                id="item-master-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search item, group, stamp, design, HSN"
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
              Total: <strong>{items.length}</strong> | Active: <strong>{activeCount}</strong> |
              Showing: <strong>{filteredItems.length}</strong>
            </div>
          </div>

          <div className="table-panel item-master-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Item Name</th>
                  <th>Metal</th>
                  <th>Group</th>
                  <th>Stamp</th>
                  <th>Design</th>
                  <th>Pack Wt.</th>
                  <th>Tunch</th>
                  <th>Wstg</th>
                  <th>Hishob</th>
                  <th>Lab Rate</th>
                  <th>Lab Type</th>
                  <th>Barcode</th>
                  <th>HSN</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={16} className="empty-row">
                      Loading items...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="empty-row">
                      {searchText ? 'No matching item found.' : 'No item added yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className={editingId === item.id ? 'selected-row' : ''}
                      onDoubleClick={() => handleEdit(item)}
                    >
                      <td>{index + 1}</td>
                      <td>{item.itemName}</td>
                      <td>{item.metalType}</td>
                      <td>{item.groupName}</td>
                      <td>{item.stampName || '-'}</td>
                      <td>{item.designName || '-'}</td>
                      <td>{formatOptionalNumber(item.fixedWeightPerPcs)}</td>
                      <td>{formatOptionalNumber(item.defaultTanch)}</td>
                      <td>{formatOptionalNumber(item.defaultWastage)}</td>
                      <td>
                        {formatOptionalNumber(
                          calculateHishob(item.defaultTanch, item.defaultWastage)
                        )}
                      </td>
                      <td>{formatOptionalNumber(item.defaultLabourRate)}</td>
                      <td>{item.labourRateType}</td>
                      <td>{item.barcodeItem ? 'Yes' : 'No'}</td>
                      <td>{item.gstHsnCode || '-'}</td>
                      <td>
                        <span className={item.active ? 'status-active' : 'status-inactive'}>
                          {item.active ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-edit"
                          type="button"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </button>

                        <button
                          className="table-delete"
                          type="button"
                          onClick={() => requestDelete(item)}
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
            Sale logic: Less Weight = Product / Pack Weight x Pcs. Net Weight = Gross Weight - Less
            Weight. Hishob = Tunch + Wastage. Fine = Net Weight x Hishob / 100.
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Item?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.itemName}"? This action cannot be undone.`
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

export default ItemMasterScreen
