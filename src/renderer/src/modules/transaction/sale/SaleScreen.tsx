import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import SalePrintPreview, { type SavedSaleRecord } from './SalePrintPreview'
import {
  calculateFineFromHishob,
  calculateHishob,
  calculateSaleItemTotals,
  type LabourRateType
} from '../../../utils/jewelleryFormula'

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

type Balance = {
  goldFine: number
  silverFine: number
  cash: number
  anamat: number
  bank: number
}

type SaleItemLine = {
  id: string
  lineType: string
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

type SalePaymentLine = {
  id: string
  type: string
  jamaNave: 'JAMA'
  details: string
  pcs: number
  weight: number
  tunch: number
  wastage: number
  hishob: number
  fine: number
  rate: number
  fineAmount: number
  anamat: number
  cash: number
  bank: number
  accountId: string
}

const emptyBalance: Balance = {
  goldFine: 0,
  silverFine: 0,
  cash: 0,
  anamat: 0,
  bank: 0
}

const initialHeader = {
  saleNo: '',
  saleDate: getTodayDate(),
  accountId: '',
  phone: '',
  metalType: 'Silver' as MetalType,
  haste: '',
  dpNo: '',
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

const initialPaymentForm = {
  type: 'DAR JAMA',
  details: '',
  pcs: '',
  weight: '',
  tunch: '',
  wastage: '',
  rate: '',
  fineAmount: '',
  anamat: '',
  cash: '',
  bank: '',
  accountId: ''
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
function getLabourRateType(value: string): LabourRateType {
  if (value === 'Gm' || value === 'Pcs') return value
  return 'Kg'
}
function SaleScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [itemForm, setItemForm] = useState(initialItemForm)
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [itemLines, setItemLines] = useState<SaleItemLine[]>([])
  const [paymentLines, setPaymentLines] = useState<SalePaymentLine[]>([])

  const [itemDeleteTarget, setItemDeleteTarget] = useState<SaleItemLine | null>(null)
  const [paymentDeleteTarget, setPaymentDeleteTarget] = useState<SalePaymentLine | null>(null)
  const [savedSale, setSavedSale] = useState<SavedSaleRecord | null>(null)

  const [openingBalance, setOpeningBalance] = useState<Balance>(emptyBalance)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
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

  const paymentTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const paymentWeightInputRef = useRef<HTMLInputElement | null>(null)
  const paymentTunchInputRef = useRef<HTMLInputElement | null>(null)
  const paymentWastageInputRef = useRef<HTMLInputElement | null>(null)
  const paymentCashInputRef = useRef<HTMLInputElement | null>(null)

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

  const paymentPreview = useMemo(() => {
    const hishob = calculateHishob(toNumber(paymentForm.tunch), toNumber(paymentForm.wastage))
    const fine = calculateFineFromHishob(toNumber(paymentForm.weight), hishob)

    return {
      hishob,
      fine
    }
  }, [paymentForm.weight, paymentForm.tunch, paymentForm.wastage])

  const itemFineTotal = useMemo(() => {
    return itemLines.reduce((total, line) => total + line.fine, 0)
  }, [itemLines])

  const itemMajuriTotal = useMemo(() => {
    return itemLines.reduce((total, line) => total + line.majuri, 0)
  }, [itemLines])

  const paymentFineJamaTotal = useMemo(() => {
    return paymentLines.reduce((total, line) => total + line.fine, 0)
  }, [paymentLines])

  const paymentCashJamaTotal = useMemo(() => {
    return paymentLines.reduce((total, line) => total + line.cash, 0)
  }, [paymentLines])

  const paymentBankJamaTotal = useMemo(() => {
    return paymentLines.reduce((total, line) => total + line.bank, 0)
  }, [paymentLines])

  const paymentAnamatJamaTotal = useMemo(() => {
    return paymentLines.reduce((total, line) => total + line.anamat, 0)
  }, [paymentLines])

  const closingBalance = useMemo(() => {
    return {
      goldFine:
        header.metalType === 'Gold'
          ? openingBalance.goldFine + itemFineTotal - paymentFineJamaTotal
          : openingBalance.goldFine,

      silverFine:
        header.metalType === 'Silver'
          ? openingBalance.silverFine + itemFineTotal - paymentFineJamaTotal
          : openingBalance.silverFine,

      cash: openingBalance.cash + itemMajuriTotal - paymentCashJamaTotal,
      anamat: openingBalance.anamat - paymentAnamatJamaTotal,
      bank: openingBalance.bank - paymentBankJamaTotal
    }
  }, [
    openingBalance,
    itemFineTotal,
    itemMajuriTotal,
    paymentFineJamaTotal,
    paymentCashJamaTotal,
    paymentBankJamaTotal,
    paymentAnamatJamaTotal,
    header.metalType
  ])

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

  const handlePaymentDecimalChange = (
    value: string,
    fieldName:
      'pcs' | 'weight' | 'tunch' | 'wastage' | 'rate' | 'fineAmount' | 'anamat' | 'cash' | 'bank'
  ): void => {
    if (!isValidAmountInput(value)) return

    setPaymentForm((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)

      const [nextSaleNo, accountData, itemData] = await Promise.all([
        window.api.sales.getNextNumber(),
        window.api.accounts.list(),
        window.api.items.list()
      ])

      setAccounts(accountData)
      setItems(itemData)

      setHeader((current) => ({
        ...current,
        saleNo: nextSaleNo
      }))
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const loadAccountBalance = async (accountId: string): Promise<void> => {
    if (!accountId) {
      setOpeningBalance(emptyBalance)
      return
    }

    try {
      const balance = await window.api.sales.getAccountBalance(accountId)
      setOpeningBalance(balance)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  const handleAccountChange = async (accountId: string): Promise<void> => {
    const account = accounts.find((currentAccount) => currentAccount.id === accountId)

    setHeader((current) => ({
      ...current,
      accountId,
      phone: account?.mobileNumber ?? ''
    }))

    await loadAccountBalance(accountId)
  }

  const handleMetalChange = (metalType: MetalType): void => {
    setHeader((current) => ({
      ...current,
      metalType
    }))

    setItemForm(initialItemForm)
    setItemLines([])
    setPaymentLines([])
    setPaymentForm(initialPaymentForm)
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

  const clearPaymentForm = (): void => {
    setPaymentForm(initialPaymentForm)

    window.setTimeout(() => {
      paymentTypeSelectRef.current?.focus()
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

    const newLine: SaleItemLine = {
      id: crypto.randomUUID(),
      lineType: 'NAVE',
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

  const handleAddPaymentLine = (): void => {
    const fine = paymentPreview.fine
    const cash = toNumber(paymentForm.cash)
    const bank = toNumber(paymentForm.bank)
    const anamat = toNumber(paymentForm.anamat)

    if (fine <= 0 && cash <= 0 && bank <= 0 && anamat <= 0) {
      showAlert('warning', 'Please enter fine, cash, bank, or anamat payment.')
      paymentWeightInputRef.current?.focus()
      return
    }

    const newPaymentLine: SalePaymentLine = {
      id: crypto.randomUUID(),
      type: paymentForm.type,
      jamaNave: 'JAMA',
      details: paymentForm.details.trim(),
      pcs: toNumber(paymentForm.pcs),
      weight: toNumber(paymentForm.weight),
      tunch: toNumber(paymentForm.tunch),
      wastage: toNumber(paymentForm.wastage),
      hishob: paymentPreview.hishob,
      fine,
      rate: toNumber(paymentForm.rate),
      fineAmount: toNumber(paymentForm.fineAmount),
      anamat,
      cash,
      bank,
      accountId: paymentForm.accountId
    }

    setPaymentLines((current) => [...current, newPaymentLine])
    clearPaymentForm()
  }

  const handleConfirmDeleteItemLine = (): void => {
    if (!itemDeleteTarget) return

    setItemLines((current) => current.filter((line) => line.id !== itemDeleteTarget.id))
    setItemDeleteTarget(null)
  }

  const handleConfirmDeletePaymentLine = (): void => {
    if (!paymentDeleteTarget) return

    setPaymentLines((current) => current.filter((line) => line.id !== paymentDeleteTarget.id))
    setPaymentDeleteTarget(null)
  }

  const validateSale = (): boolean => {
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

  const resetSale = async (): Promise<void> => {
    const nextSaleNo = await window.api.sales.getNextNumber()

    setHeader({
      ...initialHeader,
      saleNo: nextSaleNo
    })

    setItemLines([])
    setPaymentLines([])
    setOpeningBalance(emptyBalance)
    setItemForm(initialItemForm)
    setPaymentForm(initialPaymentForm)
  }

  const handleSaveSale = async (): Promise<void> => {
    if (!validateSale()) return

    try {
      setSaving(true)

      const payload = {
        saleDate: header.saleDate,
        accountId: header.accountId,
        phone: header.phone,
        metalType: header.metalType,
        haste: header.haste,
        dpNo: header.dpNo,
        narration: header.narration,
        reminderDate: header.reminderDate,
        itemLines: itemLines.map((line) => ({
          lineType: line.lineType,
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
        })),
        paymentLines: paymentLines.map((line) => ({
          type: line.type,
          jamaNave: line.jamaNave,
          details: line.details,
          pcs: line.pcs,
          weight: line.weight,
          tunch: line.tunch,
          wastage: line.wastage,
          fine: line.fine,
          rate: line.rate,
          fineAmount: line.fineAmount,
          anamat: line.anamat,
          cash: line.cash,
          bank: line.bank,
          accountId: line.accountId
        }))
      }

      const saved = await window.api.sales.create(payload)

      setSavedSale(saved)
      showAlert('success', 'Sale saved successfully.')
      await resetSale()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
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
    <div className="sale-screen">
      <div className="sale-window">
        <div className="form-title-bar">
          <span>Sale</span>

          <button className="module-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="sale-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="sale-content">
            <div className="sale-left">
              <div className="sale-panel">
                <div className="section-title">Sale Header</div>

                <div className="sale-header-grid">
                  <div className="form-field">
                    <label>Tr. No.</label>
                    <input value={header.saleNo} disabled />
                  </div>

                  <div className="form-field">
                    <label>Date</label>
                    <input
                      type="date"
                      value={header.saleDate}
                      onChange={(event) =>
                        setHeader((current) => ({
                          ...current,
                          saleDate: event.target.value
                        }))
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label>Acc Name</label>
                    <select
                      ref={accountSelectRef}
                      value={header.accountId}
                      onChange={(event) => void handleAccountChange(event.target.value)}
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
                        setHeader((current) => ({
                          ...current,
                          phone: event.target.value
                        }))
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
                    <label>Haste</label>
                    <input
                      value={header.haste}
                      onChange={(event) =>
                        setHeader((current) => ({
                          ...current,
                          haste: event.target.value
                        }))
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label>DP No.</label>
                    <input
                      value={header.dpNo}
                      onChange={(event) =>
                        setHeader((current) => ({
                          ...current,
                          dpNo: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="sale-panel">
                <div className="section-title">Item Entry</div>

                <div className="sale-item-entry-grid">
                  <div className="form-field">
                    <label>Item</label>
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
                      onChange={(event) =>
                        handleItemDecimalChange(event.target.value, 'grossWeight')
                      }
                      onKeyDown={(event) => focusNextOnEnter(event, addWeightInputRef.current)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Pack Wt.</label>
                    <input
                      value={itemForm.packWeight}
                      onChange={(event) =>
                        handleItemDecimalChange(event.target.value, 'packWeight')
                      }
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
                    <label>Lab Rate</label>
                    <input
                      ref={labourRateInputRef}
                      value={itemForm.labourRate}
                      onChange={(event) =>
                        handleItemDecimalChange(event.target.value, 'labourRate')
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Lab Type</label>
                    <select
                      value={itemForm.labourRateType}
                      onChange={(event) =>
                        setItemForm((current) => ({
                          ...current,
                          labourRateType: event.target.value as LabourRateType
                        }))
                      }
                    >
                      <option>Kg</option>
                      <option>Gm</option>
                      <option>Pcs</option>
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

                <div className="button-row sale-item-button-row">
                  <button className="btn-save" onClick={handleAddItemLine}>
                    Add Item
                  </button>

                  <button className="btn-new" onClick={clearItemForm}>
                    Clear Item
                  </button>
                </div>
              </div>

              <div className="table-panel sale-item-table-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Sr</th>
                      <th>Item</th>
                      <th>Pcs</th>
                      <th>Gr. Wt.</th>
                      <th>Pack</th>
                      <th>Less</th>
                      <th>Net</th>
                      <th>Tunch</th>
                      <th>Wstg</th>
                      <th>Hishob</th>
                      <th>Fine</th>
                      <th>Lab Rate</th>
                      <th>Lab Type</th>
                      <th>Majuri</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={15} className="empty-row">
                          Loading sale...
                        </td>
                      </tr>
                    ) : itemLines.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="empty-row">
                          No sale item added yet.
                        </td>
                      </tr>
                    ) : (
                      itemLines.map((line, index) => (
                        <tr key={line.id}>
                          <td>{index + 1}</td>
                          <td>{line.itemName}</td>
                          <td>{formatNumber(line.pcs)}</td>
                          <td>{formatNumber(line.grossWeight)}</td>
                          <td>{formatNumber(line.packWeight)}</td>
                          <td>{formatNumber(line.lessWeight)}</td>
                          <td>{formatNumber(line.netWeight)}</td>
                          <td>{formatNumber(line.tunch)}</td>
                          <td>{formatNumber(line.wastage)}</td>
                          <td>{formatNumber(line.hishob)}</td>
                          <td>{formatNumber(line.fine)}</td>
                          <td>{formatNumber(line.labourRate)}</td>
                          <td>{line.labourRateType}</td>
                          <td>{formatNumber(line.majuri)}</td>
                          <td>
                            <button
                              className="table-delete"
                              onClick={() => setItemDeleteTarget(line)}
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

              <div className="sale-payment-panel">
                <div className="section-title">Dar / Jama Payment</div>

                <div className="sale-payment-entry-grid">
                  <div className="form-field">
                    <label>Type</label>
                    <select
                      ref={paymentTypeSelectRef}
                      value={paymentForm.type}
                      onChange={(event) =>
                        setPaymentForm((current) => ({
                          ...current,
                          type: event.target.value
                        }))
                      }
                      onKeyDown={(event) => focusNextOnEnter(event, paymentWeightInputRef.current)}
                    >
                      <option>DAR JAMA</option>
                      <option>PATLA JAMA</option>
                      <option>GAT JAMA</option>
                      <option>CASH JAMA</option>
                      <option>BANK JAMA</option>
                      <option>ANAMAT JAMA</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Weight</label>
                    <input
                      ref={paymentWeightInputRef}
                      value={paymentForm.weight}
                      onChange={(event) => handlePaymentDecimalChange(event.target.value, 'weight')}
                      onKeyDown={(event) => focusNextOnEnter(event, paymentTunchInputRef.current)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Tunch</label>
                    <input
                      ref={paymentTunchInputRef}
                      value={paymentForm.tunch}
                      onChange={(event) => handlePaymentDecimalChange(event.target.value, 'tunch')}
                      onKeyDown={(event) => focusNextOnEnter(event, paymentWastageInputRef.current)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Wstg</label>
                    <input
                      ref={paymentWastageInputRef}
                      value={paymentForm.wastage}
                      onChange={(event) =>
                        handlePaymentDecimalChange(event.target.value, 'wastage')
                      }
                      onKeyDown={(event) => focusNextOnEnter(event, paymentCashInputRef.current)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field readonly-field">
                    <label>Hishob</label>
                    <input value={formatNumber(paymentPreview.hishob)} disabled />
                  </div>

                  <div className="form-field readonly-field">
                    <label>Fine</label>
                    <input value={formatNumber(paymentPreview.fine)} disabled />
                  </div>

                  <div className="form-field">
                    <label>Cash</label>
                    <input
                      ref={paymentCashInputRef}
                      value={paymentForm.cash}
                      onChange={(event) => handlePaymentDecimalChange(event.target.value, 'cash')}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Bank</label>
                    <input
                      value={paymentForm.bank}
                      onChange={(event) => handlePaymentDecimalChange(event.target.value, 'bank')}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Anamat</label>
                    <input
                      value={paymentForm.anamat}
                      onChange={(event) => handlePaymentDecimalChange(event.target.value, 'anamat')}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Details</label>
                    <input
                      value={paymentForm.details}
                      onChange={(event) =>
                        setPaymentForm((current) => ({
                          ...current,
                          details: event.target.value
                        }))
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="sale-payment-buttons">
                    <button className="btn-save" onClick={handleAddPaymentLine}>
                      Add
                    </button>

                    <button className="btn-new" onClick={clearPaymentForm}>
                      Clear
                    </button>
                  </div>
                </div>

                <div className="table-panel sale-payment-table-panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Sr</th>
                        <th>Type</th>
                        <th>Weight</th>
                        <th>Tunch</th>
                        <th>Wstg</th>
                        <th>Hishob</th>
                        <th>Fine</th>
                        <th>Cash</th>
                        <th>Bank</th>
                        <th>Anamat</th>
                        <th>Details</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paymentLines.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="empty-row">
                            No Dar/Jama payment added yet.
                          </td>
                        </tr>
                      ) : (
                        paymentLines.map((line, index) => (
                          <tr key={line.id}>
                            <td>{index + 1}</td>
                            <td>{line.type}</td>
                            <td>{formatNumber(line.weight)}</td>
                            <td>{formatNumber(line.tunch)}</td>
                            <td>{formatNumber(line.wastage)}</td>
                            <td>{formatNumber(line.hishob)}</td>
                            <td>{formatNumber(line.fine)}</td>
                            <td>{formatNumber(line.cash)}</td>
                            <td>{formatNumber(line.bank)}</td>
                            <td>{formatNumber(line.anamat)}</td>
                            <td>{line.details || '-'}</td>
                            <td>
                              <button
                                className="table-delete"
                                onClick={() => setPaymentDeleteTarget(line)}
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

              <div className="sale-footer-actions">
                <button
                  className="btn-save"
                  onClick={() => void handleSaveSale()}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Sale'}
                </button>

                <button className="btn-new" onClick={() => void resetSale()} disabled={saving}>
                  New
                </button>
              </div>
            </div>

            <aside className="sale-balance-panel">
              <div className="balance-box">
                <div className="balance-title">Opening Balance</div>
                <BalanceRow label="Gold Fine" value={openingBalance.goldFine} />
                <BalanceRow label="Silver Fine" value={openingBalance.silverFine} />
                <BalanceRow label="Cash" value={openingBalance.cash} />
                <BalanceRow label="Anamat" value={openingBalance.anamat} />
                <BalanceRow label="Bank" value={openingBalance.bank} />
              </div>

              <div className="balance-box">
                <div className="balance-title">Current Bill</div>
                <BalanceRow label="Item Fine" value={itemFineTotal} />
                <BalanceRow label="Majuri" value={itemMajuriTotal} />
              </div>

              <div className="balance-box">
                <div className="balance-title">Dar / Jama</div>
                <BalanceRow label="Fine Jama" value={paymentFineJamaTotal} />
                <BalanceRow label="Cash Jama" value={paymentCashJamaTotal} />
                <BalanceRow label="Bank Jama" value={paymentBankJamaTotal} />
                <BalanceRow label="Anamat Jama" value={paymentAnamatJamaTotal} />
              </div>

              <div className="balance-box closing-box">
                <div className="balance-title">Closing Balance</div>
                <BalanceRow label="Gold Fine" value={closingBalance.goldFine} />
                <BalanceRow label="Silver Fine" value={closingBalance.silverFine} />
                <BalanceRow label="Cash" value={closingBalance.cash} />
                <BalanceRow label="Anamat" value={closingBalance.anamat} />
                <BalanceRow label="Bank" value={closingBalance.bank} />
              </div>

              <div className="form-field">
                <label>Narration</label>
                <textarea
                  className="sale-narration"
                  value={header.narration}
                  onChange={(event) =>
                    setHeader((current) => ({
                      ...current,
                      narration: event.target.value
                    }))
                  }
                />
              </div>
            </aside>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(itemDeleteTarget)}
        title="Delete Item Line?"
        message={
          itemDeleteTarget
            ? `Are you sure you want to delete "${itemDeleteTarget.itemName}" from this sale?`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDeleteItemLine}
        onCancel={() => setItemDeleteTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(paymentDeleteTarget)}
        title="Delete Payment Line?"
        message={
          paymentDeleteTarget
            ? `Are you sure you want to delete "${paymentDeleteTarget.type}" payment?`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDeletePaymentLine}
        onCancel={() => setPaymentDeleteTarget(null)}
      />

      {savedSale && (
        <SalePrintPreview sale={savedSale} autoPrintOnOpen onClose={() => setSavedSale(null)} />
      )}
    </div>
  )
}

function BalanceRow({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="balance-row">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  )
}

export default SaleScreen
