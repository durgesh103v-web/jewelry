import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { calculateSaleItemTotals, type LabourRateType } from '../../../utils/jewelleryFormula'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Other'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
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
  active: boolean
}

type ApprovalItemLine = {
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
  unit: string
  labourRate: number
  labourRateType: LabourRateType
  fine: number
  majuri: number
}

const initialHeader = {
  approvalNo: '',
  approvalDate: getTodayDate(),
  accountId: '',
  phone: '',
  metalType: 'Silver' as MetalType,
  narration: '',
  reminderDate: ''
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
  unit: 'GM',
  labourRate: '',
  labourRateType: 'Kg' as LabourRateType
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

function getStatusLabel(status: ApprovalStatus): string {
  if (status === 'pending') return 'Pending'
  if (status === 'approved') return 'Approved'
  if (status === 'returned') return 'Returned'
  return 'Partial Return'
}

function ApprovalScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [itemForm, setItemForm] = useState(initialItemForm)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [itemLines, setItemLines] = useState<ApprovalItemLine[]>([])
  const [approvals, setApprovals] = useState<ApprovalRegisterRecord[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [itemDeleteTarget, setItemDeleteTarget] = useState<ApprovalItemLine | null>(null)
  const [approvalDeleteTarget, setApprovalDeleteTarget] = useState<ApprovalRegisterRecord | null>(
    null
  )
  const [convertTarget, setConvertTarget] = useState<ApprovalRegisterRecord | null>(null)
  const [returnAllTarget, setReturnAllTarget] = useState<ApprovalRegisterRecord | null>(null)
  const [detailRecord, setDetailRecord] = useState<SavedApprovalRecord | null>(null)
  const [selectedDetailLineIds, setSelectedDetailLineIds] = useState<string[]>([])

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApprovalStatus>('ALL')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [converting, setConverting] = useState(false)
  const [returning, setReturning] = useState(false)
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

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const activeItems = useMemo(() => {
    return items.filter((item) => item.active && item.metalType === header.metalType)
  }, [items, header.metalType])

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === itemForm.itemId)
  }, [items, itemForm.itemId])

  const itemPreview = useMemo(() => {
    return calculateSaleItemTotals({
      pcs: toNumber(itemForm.pcs),
      grossWeight: toNumber(itemForm.grossWeight),
      addWeight: toNumber(itemForm.addWeight),
      packWeight: toNumber(itemForm.packWeight),
      tunch: toNumber(itemForm.tunch),
      wastage: toNumber(itemForm.wastage),
      labourRate: toNumber(itemForm.labourRate),
      labourRateType: itemForm.labourRateType
    })
  }, [itemForm])

  const itemFineTotal = useMemo(() => {
    return itemLines.reduce((total, line) => total + line.fine, 0)
  }, [itemLines])

  const itemMajuriTotal = useMemo(() => {
    return itemLines.reduce((total, line) => total + line.majuri, 0)
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

  const filteredApprovals = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return approvals.filter((approval) => {
      const statusMatch = statusFilter === 'ALL' || approval.status === statusFilter
      const keywordMatch =
        !keyword ||
        approval.approval_no.toLowerCase().includes(keyword) ||
        approval.account_name.toLowerCase().includes(keyword) ||
        approval.mobile_number.toLowerCase().includes(keyword) ||
        approval.metal_type.toLowerCase().includes(keyword) ||
        approval.approval_date.toLowerCase().includes(keyword)

      return statusMatch && keywordMatch
    })
  }, [approvals, searchText, statusFilter])

  const statusCounts = useMemo(() => {
    return approvals.reduce(
      (counts, approval) => {
        counts.pending += approval.status === 'pending' ? 1 : 0
        counts.approved += approval.status === 'approved' ? 1 : 0
        counts.returned += approval.status === 'returned' ? 1 : 0
        counts.partial += approval.status === 'partial_return' ? 1 : 0
        return counts
      },
      { pending: 0, approved: 0, returned: 0, partial: 0 }
    )
  }, [approvals])

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
      'pcs' | 'grossWeight' | 'packWeight' | 'addWeight' | 'tunch' | 'wastage' | 'labourRate'
  ): void => {
    if (!isValidAmountInput(value)) return

    setItemForm((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const loadAccounts = useCallback(async (): Promise<void> => {
    const data = await window.api.accounts.list()
    setAccounts(data)
  }, [])

  const loadItems = useCallback(async (): Promise<void> => {
    const data = await window.api.items.list()
    setItems(data)
  }, [])

  const loadApprovals = useCallback(async (): Promise<void> => {
    const data = await window.api.approvals.list()
    setApprovals(data)
  }, [])

  const loadNextNumber = useCallback(async (): Promise<void> => {
    const nextNumber = await window.api.approvals.getNextNumber()
    setHeader((current) => ({ ...current, approvalNo: nextNumber }))
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadItems(), loadApprovals(), loadNextNumber()])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadItems, loadApprovals, loadNextNumber, showAlert])

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
      labourRateType: getLabourRateType(item.labourRateType)
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

    const newLine: ApprovalItemLine = {
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
      unit: itemForm.unit,
      labourRate: toNumber(itemForm.labourRate),
      labourRateType: itemForm.labourRateType,
      fine: itemPreview.fine,
      majuri: itemPreview.majuri
    }

    setItemLines((current) => [...current, newLine])
    clearItemForm()
  }

  const handleConfirmDeleteItemLine = (): void => {
    if (!itemDeleteTarget) return

    setItemLines((current) => current.filter((line) => line.id !== itemDeleteTarget.id))
    setItemDeleteTarget(null)
  }

  const validateApproval = (): boolean => {
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

  const buildPayload = (): ApprovalPayload => {
    return {
      approvalDate: header.approvalDate,
      accountId: header.accountId,
      phone: header.phone,
      metalType: header.metalType,
      narration: header.narration,
      reminderDate: header.reminderDate,
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
        unit: line.unit,
        labourRate: line.labourRate,
        labourRateType: line.labourRateType
      }))
    }
  }

  const handleSaveApproval = async (): Promise<void> => {
    if (!validateApproval()) return

    try {
      setSaving(true)

      const payload = buildPayload()

      if (editingId) {
        await window.api.approvals.update(editingId, payload)
      } else {
        await window.api.approvals.create(payload)
      }

      showAlert(
        'success',
        editingId ? 'Approval updated successfully.' : 'Approval saved successfully.'
      )
      await resetForm()
      await loadApprovals()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditApproval = async (approval: ApprovalRegisterRecord): Promise<void> => {
    if (approval.status !== 'pending') {
      showAlert('warning', 'Only a pending approval can be edited.')
      return
    }

    try {
      setOpening(true)
      const record = await window.api.approvals.getById(approval.id)

      setEditingId(record.header.id)
      setHeader({
        approvalNo: record.header.approval_no,
        approvalDate: record.header.approval_date,
        accountId: record.header.account_id,
        phone: record.header.mobile_number,
        metalType: record.header.metal_type as MetalType,
        narration: record.header.narration,
        reminderDate: record.header.reminder_date
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
          packWeight: Number(line.pack_weight || 0),
          lessWeight: Number(line.less_weight || 0),
          addWeight: 0,
          netWeight: Number(line.net_weight || 0),
          tunch: Number(line.tunch || 0),
          wastage: Number(line.wastage || 0),
          hishob: Number(line.hishob || 0),
          unit: 'GM',
          labourRate: Number(line.labour_rate || 0),
          labourRateType: getLabourRateType(line.labour_rate_type),
          fine: Number(line.fine || 0),
          majuri: Number(line.majuri || 0)
        }))
      )

      showAlert('success', `Editing approval ${record.header.approval_no}.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleConfirmDeleteApproval = async (): Promise<void> => {
    if (!approvalDeleteTarget) return

    try {
      setDeleting(true)
      const result = await window.api.approvals.remove(approvalDeleteTarget.id)

      if (editingId === approvalDeleteTarget.id) {
        await resetForm()
      }

      setApprovalDeleteTarget(null)
      await loadApprovals()
      showAlert('success', `Approval ${result.approvalNo} deleted successfully.`)
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
      const result = await window.api.approvals.convertToSale(convertTarget.id)

      setConvertTarget(null)
      await loadApprovals()
      showAlert(
        'success',
        `Approval ${convertTarget.approval_no} converted to sale ${result.sale.header.sale_no}.`
      )
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setConverting(false)
    }
  }

  const handleConfirmReturnAll = async (): Promise<void> => {
    if (!returnAllTarget) return

    try {
      setReturning(true)
      await window.api.approvals.returnApproval(returnAllTarget.id, {
        lineIds: [],
        returnAll: true,
        narration: ''
      })

      setReturnAllTarget(null)
      await loadApprovals()
      showAlert('success', `Approval ${returnAllTarget.approval_no} marked as returned.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setReturning(false)
    }
  }

  const handleOpenDetail = async (approval: ApprovalRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const record = await window.api.approvals.getById(approval.id)
      setDetailRecord(record)
      setSelectedDetailLineIds([])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const toggleDetailLineSelection = (lineId: string): void => {
    setSelectedDetailLineIds((current) =>
      current.includes(lineId) ? current.filter((id) => id !== lineId) : [...current, lineId]
    )
  }

  const handleReturnSelectedLines = async (): Promise<void> => {
    if (!detailRecord || selectedDetailLineIds.length === 0) {
      showAlert('warning', 'Please select at least one item line to return.')
      return
    }

    try {
      setReturning(true)
      await window.api.approvals.returnApproval(detailRecord.header.id, {
        lineIds: selectedDetailLineIds,
        returnAll: false,
        narration: ''
      })

      const refreshed = await window.api.approvals.getById(detailRecord.header.id)
      setDetailRecord(refreshed)
      setSelectedDetailLineIds([])
      await loadApprovals()
      showAlert('success', 'Selected item(s) marked as returned.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setReturning(false)
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
          <span>Approval (Maal Approval)</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="approval-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="approval-panel">
            <div className="section-title">
              {editingId ? `Edit Approval ${header.approvalNo}` : 'Approval Header'}
            </div>

            <div className="approval-header-grid">
              <div className="form-field">
                <label>Appr. No.</label>
                <input value={header.approvalNo} disabled />
              </div>

              <div className="form-field">
                <label>Date</label>
                <input
                  type="date"
                  value={header.approvalDate}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, approvalDate: event.target.value }))
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
                <label>Narration</label>
                <input
                  value={header.narration}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, narration: event.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="approval-panel">
            <div className="section-title">Item Entry</div>

            <div className="approval-item-entry-grid">
              <div className="form-field">
                <label>Stamp</label>
                <input value={itemForm.stampName || '-'} disabled />
              </div>

              <div className="form-field approval-item-wide">
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
                  <th>Stamp</th>
                  <th>Item</th>
                  <th>Item Design</th>
                  <th>Pcs</th>
                  <th>Gr. Wt.</th>
                  <th>Net Wt.</th>
                  <th>Tunch</th>
                  <th>Wstg</th>
                  <th>M. Rate</th>
                  <th>Fine</th>
                  <th>Majuri</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="empty-row">
                      Loading...
                    </td>
                  </tr>
                ) : itemLines.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="empty-row">
                      No item added yet.
                    </td>
                  </tr>
                ) : (
                  itemLines.map((line, index) => (
                    <tr key={line.id}>
                      <td>{index + 1}</td>
                      <td>{line.stampName || '-'}</td>
                      <td>{line.itemName}</td>
                      <td>{line.designName || '-'}</td>
                      <td>{formatNumber(line.pcs)}</td>
                      <td>{formatNumber(line.grossWeight)}</td>
                      <td>{formatNumber(line.netWeight)}</td>
                      <td>{formatNumber(line.tunch)}</td>
                      <td>{formatNumber(line.wastage)}</td>
                      <td>{formatNumber(line.labourRate)}</td>
                      <td>{formatNumber(line.fine)}</td>
                      <td>{formatNumber(line.majuri)}</td>
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

          <div className="approval-footer-actions">
            <button
              className="btn-save"
              onClick={() => void handleSaveApproval()}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingId ? 'Update Approval' : 'Save Approval'}
            </button>

            <button className="btn-new" onClick={() => void resetForm()} disabled={saving}>
              New
            </button>
          </div>

          <div className="approval-list-panel">
            <div className="section-title">Saved Approvals</div>

            <div className="approval-toolbar">
              <div className="form-field">
                <label htmlFor="approval-status-filter">Status</label>
                <select
                  id="approval-status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as 'ALL' | ApprovalStatus)
                  }
                >
                  <option value="ALL">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="partial_return">Partial Return</option>
                  <option value="returned">Returned</option>
                </select>
              </div>

              <div className="list-search">
                <label htmlFor="approval-search">Search</label>
                <input
                  id="approval-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search approval no, account, mobile, date"
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
                onClick={() => void loadApprovals()}
                disabled={loading}
              >
                Refresh
              </button>

              <div className="record-summary">
                Total: <strong>{approvals.length}</strong> | Pending:{' '}
                <strong>{statusCounts.pending}</strong> | Approved:{' '}
                <strong>{statusCounts.approved}</strong> | Returned:{' '}
                <strong>{statusCounts.returned}</strong> | Partial:{' '}
                <strong>{statusCounts.partial}</strong>
              </div>
            </div>

            <div className="table-panel approval-table-panel">
              <table>
                <thead>
                  <tr>
                    <th>Sr</th>
                    <th>Appr. No</th>
                    <th>Date</th>
                    <th>Account</th>
                    <th>Mobile</th>
                    <th>Metal</th>
                    <th>Fine</th>
                    <th>Majuri</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="empty-row">
                        Loading approvals...
                      </td>
                    </tr>
                  ) : filteredApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="empty-row">
                        {searchText || statusFilter !== 'ALL'
                          ? 'No matching approval found.'
                          : 'No approval saved yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredApprovals.map((approval, index) => (
                      <tr key={approval.id}>
                        <td>{index + 1}</td>
                        <td>{approval.approval_no}</td>
                        <td>{formatDate(approval.approval_date)}</td>
                        <td>{approval.account_name}</td>
                        <td>{approval.mobile_number || '-'}</td>
                        <td>{approval.metal_type}</td>
                        <td>{formatNumber(approval.item_fine_total)}</td>
                        <td>{formatNumber(approval.item_majuri_total)}</td>
                        <td>
                          <span className={`approval-badge ${approval.status}`}>
                            {getStatusLabel(approval.status)}
                          </span>
                        </td>
                        <td>
                          <div className="sale-register-actions approval-actions">
                            <button
                              className="table-edit"
                              type="button"
                              onClick={() => void handleOpenDetail(approval)}
                              disabled={opening}
                            >
                              View
                            </button>

                            {approval.status === 'pending' && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => void handleEditApproval(approval)}
                                disabled={opening || saving}
                              >
                                Edit
                              </button>
                            )}

                            {(approval.status === 'pending' ||
                              approval.status === 'partial_return') && (
                              <button
                                className="table-edit"
                                type="button"
                                onClick={() => setConvertTarget(approval)}
                                disabled={converting}
                              >
                                Convert to Sale
                              </button>
                            )}

                            {(approval.status === 'pending' ||
                              approval.status === 'partial_return') && (
                              <button
                                className="table-delete"
                                type="button"
                                onClick={() => setReturnAllTarget(approval)}
                                disabled={returning}
                              >
                                Return All
                              </button>
                            )}

                            {approval.status === 'pending' && (
                              <button
                                className="table-delete"
                                type="button"
                                onClick={() => setApprovalDeleteTarget(approval)}
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
              Approval goods leave no stock/account effect until converted to Sale. Returning an
              approval only changes its status - no stock movement is recorded because the goods
              never left inventory permanently.
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(itemDeleteTarget)}
        title="Remove Item Line?"
        message={
          itemDeleteTarget
            ? `Are you sure you want to remove "${itemDeleteTarget.itemName}" from this approval?`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDeleteItemLine}
        onCancel={() => setItemDeleteTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(approvalDeleteTarget)}
        title="Delete Approval?"
        message={
          approvalDeleteTarget
            ? `Are you sure you want to delete approval "${approvalDeleteTarget.approval_no}" for "${approvalDeleteTarget.account_name}"?`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDeleteApproval()}
        onCancel={() => {
          if (!deleting) setApprovalDeleteTarget(null)
        }}
      />

      <AppConfirmDialog
        open={Boolean(convertTarget)}
        title="Convert to Sale?"
        message={
          convertTarget
            ? `Approval "${convertTarget.approval_no}" will be converted into a real Sale bill. This will post stock and account ledger effects. This cannot be undone.`
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

      <AppConfirmDialog
        open={Boolean(returnAllTarget)}
        title="Return All Items?"
        message={
          returnAllTarget
            ? `All pending items on approval "${returnAllTarget.approval_no}" will be marked as returned. No stock movement is recorded since the goods never left inventory.`
            : ''
        }
        confirmText="Return All"
        cancelText="Cancel"
        type="warning"
        loading={returning}
        onConfirm={() => void handleConfirmReturnAll()}
        onCancel={() => {
          if (!returning) setReturnAllTarget(null)
        }}
      />

      {detailRecord && (
        <div className="print-preview-overlay">
          <div className="approval-detail-dialog">
            <div className="form-title-bar">
              <span>
                Approval {detailRecord.header.approval_no} -{' '}
                {getStatusLabel(detailRecord.header.status)}
              </span>

              <button
                className="module-close-btn"
                type="button"
                onClick={() => setDetailRecord(null)}
              >
                &times;
              </button>
            </div>

            <div className="approval-detail-body">
              <div className="approval-detail-meta">
                <div>
                  <span>Account</span>
                  <strong>{detailRecord.header.account_name}</strong>
                </div>
                <div>
                  <span>Date</span>
                  <strong>{formatDate(detailRecord.header.approval_date)}</strong>
                </div>
                <div>
                  <span>Metal</span>
                  <strong>{detailRecord.header.metal_type}</strong>
                </div>
                <div>
                  <span>Total Fine</span>
                  <strong>{formatNumber(detailRecord.header.item_fine_total)}</strong>
                </div>
              </div>

              <div className="table-panel approval-detail-table-panel">
                <table>
                  <thead>
                    <tr>
                      {detailRecord.header.status !== 'approved' &&
                        detailRecord.header.status !== 'returned' && <th>Sel</th>}
                      <th>Sr</th>
                      <th>Item</th>
                      <th>Pcs</th>
                      <th>Net Wt.</th>
                      <th>Fine</th>
                      <th>Majuri</th>
                      <th>Line Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {detailRecord.itemLines.map((line, index) => {
                      const canSelect =
                        line.return_status === 'pending' &&
                        detailRecord.header.status !== 'approved' &&
                        detailRecord.header.status !== 'returned'

                      return (
                        <tr key={line.id}>
                          {detailRecord.header.status !== 'approved' &&
                            detailRecord.header.status !== 'returned' && (
                              <td>
                                {canSelect ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedDetailLineIds.includes(line.id)}
                                    onChange={() => toggleDetailLineSelection(line.id)}
                                  />
                                ) : (
                                  '-'
                                )}
                              </td>
                            )}
                          <td>{index + 1}</td>
                          <td>{line.item_name_snapshot}</td>
                          <td>{formatNumber(line.pcs)}</td>
                          <td>{formatNumber(line.net_weight)}</td>
                          <td>{formatNumber(line.fine)}</td>
                          <td>{formatNumber(line.majuri)}</td>
                          <td>
                            <span
                              className={`approval-badge ${
                                line.return_status === 'returned' ? 'returned' : 'pending'
                              }`}
                            >
                              {line.return_status === 'returned' ? 'Returned' : 'With Customer'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {detailRecord.header.status !== 'approved' &&
                detailRecord.header.status !== 'returned' && (
                  <div className="button-row approval-detail-button-row">
                    <button
                      className="table-delete"
                      type="button"
                      onClick={() => void handleReturnSelectedLines()}
                      disabled={returning || selectedDetailLineIds.length === 0}
                    >
                      {returning ? 'Please wait...' : 'Return Selected'}
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApprovalScreen
