import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { calculateSaleItemTotals, type LabourRateType } from '../../../utils/jewelleryFormula'
import EstimatePrintPreview from './EstimatePrintPreview'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Other'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
  state: string
  active: boolean
}

type Item = {
  id: string
  itemName: string
  metalType: string
  defaultStampId: string
  stampName: string
  defaultDesignId: string
  designName: string
  fixedWeightPerPcs: number
  defaultTanch: number
  defaultWastage: number
  defaultLabourRate: number
  labourRateType: string
  gstHsnCode: string
  active: boolean
}

type EstimateItemLine = {
  id: string
  itemId: string
  itemName: string
  stampId: string
  stampName: string
  designId: string
  designName: string
  barcode: string
  remark: string
  pcs: number
  grossWeight: number
  packWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  tunch: number
  wastage: number
  hishob: number
  labourRate: number
  labourRateType: LabourRateType
  fine: number
  majuri: number
  hsnCode: string
  gstRate: number
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
}

const initialHeader = {
  estimateNo: '',
  estimateDate: getTodayDate(),
  accountId: '',
  phone: '',
  metalType: 'Silver' as MetalType,
  narration: '',
  validUntil: ''
}

const initialItemForm = {
  itemId: '',
  stampId: '',
  stampName: '',
  designId: '',
  designName: '',
  barcode: '',
  remark: '',
  pcs: '',
  grossWeight: '',
  packWeight: '',
  addWeight: '',
  tunch: '',
  wastage: '',
  labourRate: '',
  labourRateType: 'Kg' as LabourRateType,
  hsnCode: '',
  gstRate: '3',
  taxableAmount: ''
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

function isValidAmountInput(value: string): boolean {
  return /^-?\d*\.?\d*$/.test(value)
}

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function getLabourRateType(value: string): LabourRateType {
  if (value === 'Gm' || value === 'Pcs') return value
  return 'Kg'
}

function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
}

function getStatusLabel(status: EstimateStatus): string {
  if (status === 'OPEN') return 'Open'
  if (status === 'CONVERTED') return 'Converted'
  return 'Cancelled'
}

// Same-state assumption used for live preview only: mirrors the server-side rule in
// estimate.service.ts. When the account has no state on file (typical for a walk-in retail
// customer) or the firm's own state is not configured, we default to intra-state (CGST + SGST).
function isInterState(firmState: string, accountState: string): boolean {
  const cleanFirmState = firmState.trim().toLowerCase()
  const cleanAccountState = accountState.trim().toLowerCase()

  if (!cleanFirmState || !cleanAccountState) return false

  return cleanFirmState !== cleanAccountState
}

function computeGstSplit(
  taxableAmount: number,
  gstRate: number,
  interState: boolean
): { cgst: number; sgst: number; igst: number } {
  const totalTax = roundMoney((taxableAmount * gstRate) / 100)

  if (interState) {
    return { cgst: 0, sgst: 0, igst: totalTax }
  }

  const half = roundMoney(totalTax / 2)

  return { cgst: half, sgst: roundMoney(totalTax - half), igst: 0 }
}

function RetailSaleEstimateScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [itemForm, setItemForm] = useState(initialItemForm)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [itemLines, setItemLines] = useState<EstimateItemLine[]>([])
  const [estimates, setEstimates] = useState<EstimateRegisterRecord[]>([])
  const [firmState, setFirmState] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [itemDeleteTarget, setItemDeleteTarget] = useState<EstimateItemLine | null>(null)
  const [estimateDeleteTarget, setEstimateDeleteTarget] = useState<EstimateRegisterRecord | null>(
    null
  )
  const [convertTarget, setConvertTarget] = useState<EstimateRegisterRecord | null>(null)
  const [previewRecord, setPreviewRecord] = useState<SavedEstimateRecord | null>(null)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | EstimateStatus>('ALL')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [converting, setConverting] = useState(false)
  const [opening, setOpening] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const accountSelectRef = useRef<HTMLSelectElement | null>(null)
  const itemSelectRef = useRef<HTMLSelectElement | null>(null)
  const pcsInputRef = useRef<HTMLInputElement | null>(null)
  const grossWeightInputRef = useRef<HTMLInputElement | null>(null)
  const addWeightInputRef = useRef<HTMLInputElement | null>(null)
  const wastageInputRef = useRef<HTMLInputElement | null>(null)
  const labourRateInputRef = useRef<HTMLInputElement | null>(null)
  const taxableAmountInputRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const activeItems = useMemo(() => {
    return items.filter((item) => item.active && item.metalType === header.metalType)
  }, [items, header.metalType])

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === itemForm.itemId)
  }, [items, itemForm.itemId])

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account.id === header.accountId)
  }, [accounts, header.accountId])

  const interState = useMemo(() => {
    return isInterState(firmState, selectedAccount?.state ?? '')
  }, [firmState, selectedAccount])

  const itemPreview = useMemo(() => {
    const totals = calculateSaleItemTotals({
      pcs: toNumber(itemForm.pcs),
      grossWeight: toNumber(itemForm.grossWeight),
      addWeight: toNumber(itemForm.addWeight),
      packWeight: toNumber(itemForm.packWeight),
      tunch: toNumber(itemForm.tunch),
      wastage: toNumber(itemForm.wastage),
      labourRate: toNumber(itemForm.labourRate),
      labourRateType: itemForm.labourRateType
    })

    const gstSplit = computeGstSplit(
      toNumber(itemForm.taxableAmount),
      toNumber(itemForm.gstRate),
      interState
    )

    return { ...totals, ...gstSplit }
  }, [itemForm, interState])

  const itemFineTotal = useMemo(() => {
    return itemLines.reduce((total, line) => total + line.fine, 0)
  }, [itemLines])

  const itemMajuriTotal = useMemo(() => {
    return itemLines.reduce((total, line) => total + line.majuri, 0)
  }, [itemLines])

  const gstTotals = useMemo(() => {
    return itemLines.reduce(
      (total, line) => {
        total.taxableAmount += Number(line.taxableAmount || 0)
        total.cgstAmount += Number(line.cgstAmount || 0)
        total.sgstAmount += Number(line.sgstAmount || 0)
        total.igstAmount += Number(line.igstAmount || 0)
        return total
      },
      { taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 }
    )
  }, [itemLines])

  const itemSummaryTotals = useMemo(() => {
    return itemLines.reduce(
      (total, line) => {
        total.pcs += Number(line.pcs || 0)
        total.grossWeight += Number(line.grossWeight || 0)
        total.netWeight += Number(line.netWeight || 0)
        return total
      },
      { pcs: 0, grossWeight: 0, netWeight: 0 }
    )
  }, [itemLines])

  const filteredEstimates = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return estimates.filter((estimate) => {
      const statusMatch = statusFilter === 'ALL' || estimate.status === statusFilter
      const keywordMatch =
        !keyword ||
        estimate.estimate_no.toLowerCase().includes(keyword) ||
        estimate.account_name.toLowerCase().includes(keyword) ||
        estimate.mobile_number.toLowerCase().includes(keyword) ||
        estimate.metal_type.toLowerCase().includes(keyword) ||
        estimate.estimate_date.toLowerCase().includes(keyword)

      return statusMatch && keywordMatch
    })
  }, [estimates, searchText, statusFilter])

  const statusCounts = useMemo(() => {
    return estimates.reduce(
      (counts, estimate) => {
        counts.open += estimate.status === 'OPEN' ? 1 : 0
        counts.converted += estimate.status === 'CONVERTED' ? 1 : 0
        return counts
      },
      { open: 0, converted: 0 }
    )
  }, [estimates])

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
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    nextElement?.focus()
  }

  const handleItemDecimalChange = (
    value: string,
    fieldName:
      | 'pcs'
      | 'grossWeight'
      | 'packWeight'
      | 'addWeight'
      | 'tunch'
      | 'wastage'
      | 'labourRate'
      | 'gstRate'
      | 'taxableAmount'
  ): void => {
    if (!isValidAmountInput(value)) return

    setItemForm((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const loadAccounts = useCallback(async (): Promise<void> => {
    const data = await window.api.accounts.list()
    setAccounts(data as unknown as Account[])
  }, [])

  const loadItems = useCallback(async (): Promise<void> => {
    const data = await window.api.items.list()
    setItems(data as unknown as Item[])
  }, [])

  const loadEstimates = useCallback(async (): Promise<void> => {
    const data = await window.api.estimates.list()
    setEstimates(data)
  }, [])

  const loadNextNumber = useCallback(async (): Promise<void> => {
    const nextNumber = await window.api.estimates.getNextNumber()
    setHeader((current) => ({ ...current, estimateNo: nextNumber }))
  }, [])

  const loadFirmState = useCallback(async (): Promise<void> => {
    try {
      const firm = await window.api.firm.get()
      setFirmState(firm?.state ?? '')
    } catch {
      setFirmState('')
    }
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([
        loadAccounts(),
        loadItems(),
        loadEstimates(),
        loadNextNumber(),
        loadFirmState()
      ])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadItems, loadEstimates, loadNextNumber, loadFirmState, showAlert])

  const handleAccountChange = (accountId: string): void => {
    const account = accounts.find((currentAccount) => currentAccount.id === accountId)

    setHeader((current) => ({
      ...current,
      accountId,
      phone: account?.mobileNumber ?? ''
    }))
  }

  const handleMetalChange = (metalType: MetalType): void => {
    setHeader((current) => ({ ...current, metalType }))
    setItemForm(initialItemForm)
    setItemLines([])
  }

  const handleItemChange = (itemId: string): void => {
    const item = items.find((currentItem) => currentItem.id === itemId)

    if (!item) {
      setItemForm(initialItemForm)
      return
    }

    setItemForm((current) => ({
      ...current,
      itemId: item.id,
      stampId: item.defaultStampId,
      stampName: item.stampName,
      designId: item.defaultDesignId,
      designName: item.designName,
      packWeight: item.fixedWeightPerPcs === 0 ? '' : String(item.fixedWeightPerPcs),
      tunch: item.defaultTanch === 0 ? '' : String(item.defaultTanch),
      wastage: item.defaultWastage === 0 ? '' : String(item.defaultWastage),
      labourRate: item.defaultLabourRate === 0 ? '' : String(item.defaultLabourRate),
      labourRateType: getLabourRateType(item.labourRateType),
      hsnCode: item.gstHsnCode || ''
    }))

    window.setTimeout(() => {
      pcsInputRef.current?.focus()
    }, 0)
  }

  const clearItemForm = (): void => {
    setItemForm(initialItemForm)

    window.setTimeout(() => {
      itemSelectRef.current?.focus()
    }, 0)
  }

  const handleAddItemLine = (): void => {
    if (!selectedItem) {
      showAlert('warning', 'Please select item.')
      itemSelectRef.current?.focus()
      return
    }

    if (toNumber(itemForm.pcs) <= 0) {
      showAlert('warning', 'Please enter pcs.')
      pcsInputRef.current?.focus()
      return
    }

    if (toNumber(itemForm.grossWeight) <= 0) {
      showAlert('warning', 'Please enter gross weight.')
      grossWeightInputRef.current?.focus()
      return
    }

    if (itemPreview.netWeight < 0) {
      showAlert('warning', 'Net weight cannot be negative.')
      grossWeightInputRef.current?.focus()
      return
    }

    const newLine: EstimateItemLine = {
      id: crypto.randomUUID(),
      itemId: selectedItem.id,
      itemName: selectedItem.itemName,
      stampId: itemForm.stampId,
      stampName: itemForm.stampName,
      designId: itemForm.designId,
      designName: itemForm.designName,
      barcode: itemForm.barcode.trim(),
      remark: itemForm.remark.trim(),
      pcs: toNumber(itemForm.pcs),
      grossWeight: toNumber(itemForm.grossWeight),
      packWeight: toNumber(itemForm.packWeight),
      lessWeight: itemPreview.lessWeight,
      addWeight: toNumber(itemForm.addWeight),
      netWeight: itemPreview.netWeight,
      tunch: toNumber(itemForm.tunch),
      wastage: toNumber(itemForm.wastage),
      hishob: itemPreview.hishob,
      labourRate: toNumber(itemForm.labourRate),
      labourRateType: itemForm.labourRateType,
      fine: itemPreview.fine,
      majuri: itemPreview.majuri,
      hsnCode: itemForm.hsnCode.trim(),
      gstRate: toNumber(itemForm.gstRate),
      taxableAmount: toNumber(itemForm.taxableAmount),
      cgstAmount: itemPreview.cgst,
      sgstAmount: itemPreview.sgst,
      igstAmount: itemPreview.igst
    }

    setItemLines((current) => [...current, newLine])
    clearItemForm()
  }

  const handleConfirmDeleteItemLine = (): void => {
    if (!itemDeleteTarget) return

    setItemLines((current) => current.filter((line) => line.id !== itemDeleteTarget.id))
    setItemDeleteTarget(null)
  }

  const validateEstimate = (): boolean => {
    if (!header.accountId) {
      showAlert('warning', 'Please select account.')
      accountSelectRef.current?.focus()
      return false
    }

    if (itemLines.length === 0) {
      showAlert('warning', 'Please add at least one item.')
      itemSelectRef.current?.focus()
      return false
    }

    return true
  }

  const resetForm = async (): Promise<void> => {
    setEditingId(null)
    setHeader(initialHeader)
    setItemForm(initialItemForm)
    setItemLines([])
    await loadNextNumber()
  }

  const buildPayload = (): EstimatePayload => {
    return {
      estimateDate: header.estimateDate,
      accountId: header.accountId,
      phone: header.phone,
      metalType: header.metalType,
      narration: header.narration,
      validUntil: header.validUntil,
      itemLines: itemLines.map((line) => ({
        itemId: line.itemId,
        stampId: line.stampId,
        designId: line.designId,
        barcode: line.barcode,
        remark: line.remark,
        pcs: line.pcs,
        grossWeight: line.grossWeight,
        addWeight: line.addWeight,
        packWeight: line.packWeight,
        tunch: line.tunch,
        wastage: line.wastage,
        labourRate: line.labourRate,
        labourRateType: line.labourRateType,
        hsnCode: line.hsnCode,
        gstRate: line.gstRate,
        taxableAmount: line.taxableAmount
      }))
    }
  }

  const handleSaveEstimate = async (): Promise<void> => {
    if (!validateEstimate()) return

    try {
      setSaving(true)

      const payload = buildPayload()

      if (editingId) {
        await window.api.estimates.update(editingId, payload)
      } else {
        await window.api.estimates.create(payload)
      }

      showAlert(
        'success',
        editingId ? 'Estimate updated successfully.' : 'Estimate saved successfully.'
      )
      await resetForm()
      await loadEstimates()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditEstimate = async (estimate: EstimateRegisterRecord): Promise<void> => {
    if (estimate.status !== 'OPEN') {
      showAlert('warning', 'Only an open estimate can be edited.')
      return
    }

    try {
      setOpening(true)
      const record = await window.api.estimates.getById(estimate.id)

      setEditingId(record.header.id)
      setHeader({
        estimateNo: record.header.estimate_no,
        estimateDate: record.header.estimate_date,
        accountId: record.header.account_id,
        phone: record.header.mobile_number,
        metalType: record.header.metal_type as MetalType,
        narration: record.header.narration,
        validUntil: record.header.valid_until
      })

      setItemLines(
        record.itemLines.map((line) => ({
          id: line.id,
          itemId: line.item_id,
          itemName: line.item_name_snapshot,
          stampId: '',
          stampName: '',
          designId: '',
          designName: '',
          barcode: line.barcode,
          remark: line.remark,
          pcs: Number(line.pcs || 0),
          grossWeight: Number(line.gross_weight || 0),
          packWeight: 0,
          lessWeight: 0,
          addWeight: 0,
          netWeight: Number(line.net_weight || 0),
          tunch: Number(line.tunch || 0),
          wastage: Number(line.wastage || 0),
          hishob: Number(line.tunch || 0) + Number(line.wastage || 0),
          labourRate: 0,
          labourRateType: 'Kg' as LabourRateType,
          fine: Number(line.fine || 0),
          majuri: Number(line.majuri || 0),
          hsnCode: line.hsn_code || '',
          gstRate: Number(line.gst_rate || 0),
          taxableAmount: Number(line.taxable_amount || 0),
          cgstAmount: Number(line.cgst_amount || 0),
          sgstAmount: Number(line.sgst_amount || 0),
          igstAmount: Number(line.igst_amount || 0)
        }))
      )

      showAlert('success', `Editing estimate ${record.header.estimate_no}.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleConfirmDeleteEstimate = async (): Promise<void> => {
    if (!estimateDeleteTarget) return

    try {
      setDeleting(true)
      const result = await window.api.estimates.remove(estimateDeleteTarget.id)

      if (editingId === estimateDeleteTarget.id) {
        await resetForm()
      }

      setEstimateDeleteTarget(null)
      await loadEstimates()
      showAlert('success', `Estimate ${result.estimateNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmConvertToSale = async (): Promise<void> => {
    if (!convertTarget) return

    try {
      setConverting(true)
      const result = await window.api.estimates.convertToSale(convertTarget.id)

      setConvertTarget(null)
      await loadEstimates()
      showAlert(
        'success',
        `Estimate ${convertTarget.estimate_no} converted to sale ${result.sale.header.sale_no}.`
      )
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setConverting(false)
    }
  }

  const handleOpenPreview = async (estimate: EstimateRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const record = await window.api.estimates.getById(estimate.id)
      setPreviewRecord(record)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadInitialData()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadInitialData])

  return (
    <div className="approval-screen">
      <div className="approval-window">
        <div className="form-title-bar">
          <span>Retail Sale Estimate</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="approval-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="approval-panel">
            <div className="section-title">
              {editingId ? `Edit Estimate ${header.estimateNo}` : 'Estimate Header'}
            </div>

            <div className="approval-header-grid">
              <div className="form-field">
                <label>Est. No.</label>
                <input value={header.estimateNo} disabled />
              </div>

              <div className="form-field">
                <label>Date</label>
                <input
                  type="date"
                  value={header.estimateDate}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, estimateDate: event.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <label>Acc Name</label>
                <select
                  ref={accountSelectRef}
                  value={header.accountId}
                  onChange={(event) => handleAccountChange(event.target.value)}
                >
                  <option value="">Select Account</option>
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Phone</label>
                <input
                  value={header.phone}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <label>Gold / Silver</label>
                <select
                  value={header.metalType}
                  onChange={(event) => handleMetalChange(event.target.value as MetalType)}
                >
                  <option>Gold</option>
                  <option>Silver</option>
                  <option>Diamond</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="form-field">
                <label>Valid Until</label>
                <input
                  type="date"
                  value={header.validUntil}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, validUntil: event.target.value }))
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginTop: '8px'
              }}
            >
              <div className="form-field">
                <label>Narration</label>
                <input
                  value={header.narration}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, narration: event.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="form-field readonly-field">
                <label>GST Type (auto)</label>
                <input value={interState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'} disabled />
              </div>
            </div>
          </div>

          <div className="approval-panel">
            <div className="section-title">Item Entry</div>

            <div className="estimate-item-entry-grid">
              <div className="form-field">
                <label>Stamp</label>
                <input value={itemForm.stampName || '-'} disabled />
              </div>

              <div className="form-field">
                <label>Item Name</label>
                <select
                  ref={itemSelectRef}
                  value={itemForm.itemId}
                  onChange={(event) => handleItemChange(event.target.value)}
                  onKeyDown={(event) => focusNextOnEnter(event, pcsInputRef.current)}
                >
                  <option value="">Select Item</option>
                  {activeItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Item Design</label>
                <input value={itemForm.designName || '-'} disabled />
              </div>

              <div className="form-field">
                <label>Pcs</label>
                <input
                  ref={pcsInputRef}
                  value={itemForm.pcs}
                  onChange={(event) => handleItemDecimalChange(event.target.value, 'pcs')}
                  onKeyDown={(event) => focusNextOnEnter(event, grossWeightInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Gr. Wt.</label>
                <input
                  ref={grossWeightInputRef}
                  value={itemForm.grossWeight}
                  onChange={(event) => handleItemDecimalChange(event.target.value, 'grossWeight')}
                  onKeyDown={(event) => focusNextOnEnter(event, addWeightInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Pack Wt.</label>
                <input
                  value={itemForm.packWeight}
                  onChange={(event) => handleItemDecimalChange(event.target.value, 'packWeight')}
                  placeholder="0"
                />
              </div>

              <div className="form-field readonly-field">
                <label>Less Wt.</label>
                <input value={formatNumber(itemPreview.lessWeight)} disabled />
              </div>

              <div className="form-field">
                <label>Add Wt.</label>
                <input
                  ref={addWeightInputRef}
                  value={itemForm.addWeight}
                  onChange={(event) => handleItemDecimalChange(event.target.value, 'addWeight')}
                  onKeyDown={(event) => focusNextOnEnter(event, wastageInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field readonly-field">
                <label>Net Wt.</label>
                <input value={formatNumber(itemPreview.netWeight)} disabled />
              </div>

              <div className="form-field">
                <label>Tunch</label>
                <input
                  value={itemForm.tunch}
                  onChange={(event) => handleItemDecimalChange(event.target.value, 'tunch')}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Wstg</label>
                <input
                  ref={wastageInputRef}
                  value={itemForm.wastage}
                  onChange={(event) => handleItemDecimalChange(event.target.value, 'wastage')}
                  onKeyDown={(event) => focusNextOnEnter(event, labourRateInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field readonly-field">
                <label>Hishob</label>
                <input value={formatNumber(itemPreview.hishob)} disabled />
              </div>

              <div className="form-field">
                <label>Majuri Rate</label>
                <input
                  ref={labourRateInputRef}
                  value={itemForm.labourRate}
                  onChange={(event) => handleItemDecimalChange(event.target.value, 'labourRate')}
                  onKeyDown={(event) => focusNextOnEnter(event, taxableAmountInputRef.current)}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Unit</label>
                <select
                  value={itemForm.labourRateType}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      labourRateType: event.target.value as LabourRateType
                    }))
                  }
                >
                  <option value="Kg">Kg</option>
                  <option value="Gm">Gm</option>
                  <option value="Pcs">Pcs</option>
                </select>
              </div>

              <div className="form-field readonly-field">
                <label>Fine</label>
                <input value={formatNumber(itemPreview.fine)} disabled />
              </div>

              <div className="form-field readonly-field">
                <label>Majuri</label>
                <input value={formatNumber(itemPreview.majuri)} disabled />
              </div>

              <div className="form-field">
                <label>HSN Code</label>
                <input
                  value={itemForm.hsnCode}
                  onChange={(event) =>
                    setItemForm((current) => ({ ...current, hsnCode: event.target.value }))
                  }
                  placeholder="HSN"
                />
              </div>

              <div className="form-field">
                <label>GST %</label>
                <input
                  value={itemForm.gstRate}
                  onChange={(event) => handleItemDecimalChange(event.target.value, 'gstRate')}
                  placeholder="0"
                />
              </div>

              <div className="form-field">
                <label>Taxable Amt</label>
                <input
                  ref={taxableAmountInputRef}
                  value={itemForm.taxableAmount}
                  onChange={(event) => handleItemDecimalChange(event.target.value, 'taxableAmount')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleAddItemLine()
                    }
                  }}
                  placeholder="0"
                />
              </div>

              <div className="form-field readonly-field">
                <label>CGST</label>
                <input value={formatAmount(itemPreview.cgst)} disabled />
              </div>

              <div className="form-field readonly-field">
                <label>SGST</label>
                <input value={formatAmount(itemPreview.sgst)} disabled />
              </div>

              <div className="form-field readonly-field">
                <label>IGST</label>
                <input value={formatAmount(itemPreview.igst)} disabled />
              </div>
            </div>

            <div className="button-row approval-item-button-row">
              <button className="btn-save" onClick={handleAddItemLine}>
                Add Item
              </button>

              <button className="btn-new" onClick={clearItemForm}>
                Clear Item
              </button>
            </div>
          </div>

          <div className="table-panel approval-item-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Item</th>
                  <th>Pcs</th>
                  <th>Net Wt.</th>
                  <th>Tunch</th>
                  <th>Wstg</th>
                  <th>Fine</th>
                  <th>Majuri</th>
                  <th>HSN</th>
                  <th>GST%</th>
                  <th>Taxable</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={15} className="empty-row">
                      Loading...
                    </td>
                  </tr>
                ) : itemLines.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="empty-row">
                      No item added yet.
                    </td>
                  </tr>
                ) : (
                  itemLines.map((line, index) => (
                    <tr key={line.id}>
                      <td>{index + 1}</td>
                      <td>{line.itemName}</td>
                      <td>{formatNumber(line.pcs)}</td>
                      <td>{formatNumber(line.netWeight)}</td>
                      <td>{formatNumber(line.tunch)}</td>
                      <td>{formatNumber(line.wastage)}</td>
                      <td>{formatNumber(line.fine)}</td>
                      <td>{formatAmount(line.majuri)}</td>
                      <td>{line.hsnCode || '-'}</td>
                      <td>{formatNumber(line.gstRate)}</td>
                      <td>{formatAmount(line.taxableAmount)}</td>
                      <td>{formatAmount(line.cgstAmount)}</td>
                      <td>{formatAmount(line.sgstAmount)}</td>
                      <td>{formatAmount(line.igstAmount)}</td>
                      <td>
                        <button
                          className="btn-delete-small"
                          type="button"
                          onClick={() => setItemDeleteTarget(line)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="sale-item-summary-row">
            <div>
              <span>Pcs</span>
              <strong>{formatNumber(itemSummaryTotals.pcs)}</strong>
            </div>

            <div>
              <span>Gr. Wt.</span>
              <strong>{formatNumber(itemSummaryTotals.grossWeight)}</strong>
            </div>

            <div>
              <span>Net Wt.</span>
              <strong>{formatNumber(itemSummaryTotals.netWeight)}</strong>
            </div>

            <div>
              <span>Fine</span>
              <strong>{formatNumber(itemFineTotal)}</strong>
            </div>

            <div>
              <span>Majuri</span>
              <strong>{formatNumber(itemMajuriTotal)}</strong>
            </div>
          </div>

          <div className="gst-report-summary">
            <div>
              <span>Taxable Amt</span>
              <strong>{formatAmount(gstTotals.taxableAmount)}</strong>
            </div>
            <div>
              <span>CGST</span>
              <strong>{formatAmount(gstTotals.cgstAmount)}</strong>
            </div>
            <div>
              <span>SGST</span>
              <strong>{formatAmount(gstTotals.sgstAmount)}</strong>
            </div>
            <div>
              <span>IGST</span>
              <strong>{formatAmount(gstTotals.igstAmount)}</strong>
            </div>
            <div>
              <span>Total Tax</span>
              <strong>
                {formatAmount(gstTotals.cgstAmount + gstTotals.sgstAmount + gstTotals.igstAmount)}
              </strong>
            </div>
            <div>
              <span>Grand Total</span>
              <strong>
                {formatAmount(
                  gstTotals.taxableAmount +
                    gstTotals.cgstAmount +
                    gstTotals.sgstAmount +
                    gstTotals.igstAmount +
                    itemMajuriTotal
                )}
              </strong>
            </div>
          </div>

          <div className="approval-footer-actions">
            <button
              className="btn-save"
              onClick={() => void handleSaveEstimate()}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingId ? 'Update Estimate' : 'Save Estimate'}
            </button>

            <button className="btn-new" onClick={() => void resetForm()} disabled={saving}>
              New
            </button>
          </div>

          <div className="approval-list-panel">
            <div className="section-title">Saved Estimates</div>

            <div className="approval-toolbar">
              <div className="form-field">
                <label htmlFor="estimate-status-filter">Status</label>
                <select
                  id="estimate-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'ALL' | EstimateStatus)}
                >
                  <option value="ALL">All</option>
                  <option value="OPEN">Open</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="list-search">
                <label htmlFor="estimate-search">Search</label>
                <input
                  id="estimate-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search estimate no, account, mobile, date"
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
                onClick={() => void loadEstimates()}
                disabled={loading}
              >
                Refresh
              </button>

              <div className="record-summary">
                Total: <strong>{estimates.length}</strong> | Open:{' '}
                <strong>{statusCounts.open}</strong> | Converted:{' '}
                <strong>{statusCounts.converted}</strong>
              </div>
            </div>

            <div className="table-panel approval-table-panel">
              <table>
                <thead>
                  <tr>
                    <th>Sr</th>
                    <th>Est. No</th>
                    <th>Date</th>
                    <th>Account</th>
                    <th>Mobile</th>
                    <th>Metal</th>
                    <th>Fine</th>
                    <th>Majuri</th>
                    <th>Taxable</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="empty-row">
                        Loading estimates...
                      </td>
                    </tr>
                  ) : filteredEstimates.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="empty-row">
                        {searchText || statusFilter !== 'ALL'
                          ? 'No matching estimate found.'
                          : 'No estimate saved yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredEstimates.map((estimate, index) => (
                      <tr key={estimate.id}>
                        <td>{index + 1}</td>
                        <td>{estimate.estimate_no}</td>
                        <td>{formatDate(estimate.estimate_date)}</td>
                        <td>{estimate.account_name}</td>
                        <td>{estimate.mobile_number || '-'}</td>
                        <td>{estimate.metal_type}</td>
                        <td>{formatNumber(estimate.item_fine_total)}</td>
                        <td>{formatAmount(estimate.item_majuri_total)}</td>
                        <td>{formatAmount(estimate.taxable_amount)}</td>
                        <td>
                          <span className={`approval-badge ${estimate.status.toLowerCase()}`}>
                            {getStatusLabel(estimate.status)}
                          </span>
                        </td>
                        <td>
                          <div className="sale-register-actions approval-actions">
                            <button
                              className="table-edit"
                              type="button"
                              onClick={() => void handleOpenPreview(estimate)}
                              disabled={opening}
                            >
                              View / Print
                            </button>

                            {estimate.status === 'OPEN' && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => void handleEditEstimate(estimate)}
                                disabled={opening || saving}
                              >
                                Edit
                              </button>
                            )}

                            {estimate.status === 'OPEN' && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => setConvertTarget(estimate)}
                                disabled={converting}
                              >
                                Convert to Sale
                              </button>
                            )}

                            {estimate.status === 'OPEN' && (
                              <button
                                className="table-delete"
                                type="button"
                                onClick={() => setEstimateDeleteTarget(estimate)}
                                disabled={deleting}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="screen-help-text">
              Estimate is a non-binding quotation - it does not affect stock or account balance
              until converted to a real Sale. CGST / SGST vs IGST split is computed automatically
              from the firm and customer state; taxable amount is entered manually per item since
              this ERP does not keep a live metal rate master.
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(itemDeleteTarget)}
        title="Remove Item Line?"
        message={
          itemDeleteTarget
            ? `Are you sure you want to remove "${itemDeleteTarget.itemName}" from this estimate?`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDeleteItemLine}
        onCancel={() => setItemDeleteTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(estimateDeleteTarget)}
        title="Delete Estimate?"
        message={
          estimateDeleteTarget
            ? `Are you sure you want to delete estimate "${estimateDeleteTarget.estimate_no}" for "${estimateDeleteTarget.account_name}"?`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDeleteEstimate()}
        onCancel={() => {
          if (!deleting) setEstimateDeleteTarget(null)
        }}
      />

      <AppConfirmDialog
        open={Boolean(convertTarget)}
        title="Convert to Sale?"
        message={
          convertTarget
            ? `Estimate "${convertTarget.estimate_no}" will be converted into a real Sale bill. This will post stock and account ledger effects. This cannot be undone.`
            : ''
        }
        confirmText="Convert"
        cancelText="Cancel"
        type="info"
        loading={converting}
        onConfirm={() => void handleConfirmConvertToSale()}
        onCancel={() => {
          if (!converting) setConvertTarget(null)
        }}
      />

      {previewRecord && (
        <EstimatePrintPreview estimate={previewRecord} onClose={() => setPreviewRecord(null)} />
      )}
    </div>
  )
}

export default RetailSaleEstimateScreen
