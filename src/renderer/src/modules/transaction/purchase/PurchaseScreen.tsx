import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import {
  calculateFine,
  calculateHishob,
  calculateSaleItemTotals,
  type LabourRateType
} from '../../../utils/jewelleryFormula'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Other'

type Balance = {
  goldFine: number
  silverFine: number
  cash: number
  bank: number
  anamat: number
}

type PurchaseItemLine = {
  lineNo: number
  itemId: string
  stampId: string
  designId: string
  itemName: string
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
}

type PurchasePaymentLine = {
  lineNo: number
  type: string
  details: string
  pcs: number
  weight: number
  tanch: number
  wastage: number
  hishob: number
  fine: number
  rate: number
  fineAmount: number
  anamat: number
  cash: number
  bank: number
}

const emptyBalance: Balance = { goldFine: 0, silverFine: 0, cash: 0, bank: 0, anamat: 0 }

const initialItemForm = {
  itemId: '',
  stampId: '',
  designId: '',
  barcode: '',
  remark: '',
  pcs: '',
  grossWeight: '',
  packWeight: '',
  addWeight: '',
  tunch: '',
  wastage: '',
  labourRate: '',
  labourRateType: 'Kg' as LabourRateType
}

const initialPaymentForm = {
  type: 'CASH NAVE',
  details: '',
  pcs: '',
  weight: '',
  tanch: '',
  wastage: '',
  rate: '',
  fineAmount: '',
  anamat: '',
  cash: '',
  bank: ''
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
  return /^\d*\.?\d*$/.test(value)
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

function PurchaseScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [purchaseNo, setPurchaseNo] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(getTodayDate())
  const [accountId, setAccountId] = useState('')
  const [phone, setPhone] = useState('')
  const [metalType, setMetalType] = useState<MetalType>('Silver')
  const [haste, setHaste] = useState('')
  const [dpNo, setDpNo] = useState('')
  const [narration, setNarration] = useState('')

  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [items, setItems] = useState<ItemRecord[]>([])
  const [stamps, setStamps] = useState<ItemStampRecord[]>([])
  const [designs, setDesigns] = useState<ItemDesignRecord[]>([])

  const [itemForm, setItemForm] = useState(initialItemForm)
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm)
  const [itemLines, setItemLines] = useState<PurchaseItemLine[]>([])
  const [paymentLines, setPaymentLines] = useState<PurchasePaymentLine[]>([])
  const [oldBalance, setOldBalance] = useState<Balance>(emptyBalance)

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId),
    [accounts, accountId]
  )
  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])
  const filteredItems = useMemo(
    () => items.filter((item) => item.metalType === metalType && item.active),
    [items, metalType]
  )
  const filteredStamps = useMemo(
    () => stamps.filter((stamp) => stamp.metalType === metalType && stamp.active),
    [stamps, metalType]
  )
  const filteredDesigns = useMemo(
    () => designs.filter((design) => design.metalType === metalType && design.active),
    [designs, metalType]
  )

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
    const hishob = calculateHishob(toNumber(paymentForm.tanch), toNumber(paymentForm.wastage))
    const fine = calculateFine(
      toNumber(paymentForm.weight),
      toNumber(paymentForm.tanch),
      toNumber(paymentForm.wastage)
    )
    return { hishob, fine }
  }, [paymentForm])

  const totals = useMemo(() => {
    const itemFineTotal = itemLines.reduce((sum, line) => sum + Number(line.fine || 0), 0)
    const itemMajuriTotal = itemLines.reduce((sum, line) => sum + Number(line.majuri || 0), 0)
    const paymentFineNaveTotal = paymentLines.reduce((sum, line) => sum + Number(line.fine || 0), 0)
    const paymentCashNaveTotal = paymentLines.reduce((sum, line) => sum + Number(line.cash || 0), 0)
    const paymentBankNaveTotal = paymentLines.reduce((sum, line) => sum + Number(line.bank || 0), 0)
    const paymentAnamatNaveTotal = paymentLines.reduce(
      (sum, line) => sum + Number(line.anamat || 0),
      0
    )

    const closingGoldFine =
      metalType === 'Gold'
        ? oldBalance.goldFine - itemFineTotal + paymentFineNaveTotal
        : oldBalance.goldFine
    const closingSilverFine =
      metalType === 'Silver'
        ? oldBalance.silverFine - itemFineTotal + paymentFineNaveTotal
        : oldBalance.silverFine
    const closingCash = oldBalance.cash - itemMajuriTotal + paymentCashNaveTotal
    const closingBank = oldBalance.bank + paymentBankNaveTotal
    const closingAnamat = oldBalance.anamat + paymentAnamatNaveTotal

    return {
      itemFineTotal,
      itemMajuriTotal,
      paymentFineNaveTotal,
      paymentCashNaveTotal,
      paymentBankNaveTotal,
      paymentAnamatNaveTotal,
      closingGoldFine,
      closingSilverFine,
      closingCash,
      closingBank,
      closingAnamat
    }
  }, [itemLines, paymentLines, oldBalance, metalType])

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

  const loadAccountBalance = useCallback(
    async (selectedAccountId: string): Promise<void> => {
      if (!selectedAccountId) {
        setOldBalance(emptyBalance)
        return
      }

      try {
        const balance = await window.api.purchases.getAccountBalance(selectedAccountId)
        setOldBalance(balance)
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      }
    },
    [showAlert]
  )

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const [nextNo, accountData, itemData, stampData, designData] = await Promise.all([
        window.api.purchases.getNextNumber(),
        window.api.accounts.list(),
        window.api.items.list(),
        window.api.itemStamps.list(),
        window.api.itemDesigns.list()
      ])

      setPurchaseNo(nextNo)
      setAccounts(accountData)
      setItems(itemData)
      setStamps(stampData)
      setDesigns(designData)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const handleAccountChange = (selectedAccountId: string): void => {
    setAccountId(selectedAccountId)
    const account = accounts.find((item) => item.id === selectedAccountId)
    setPhone(account?.mobileNumber || '')
    void loadAccountBalance(selectedAccountId)
  }

  const handleMetalChange = (value: MetalType): void => {
    setMetalType(value)
    setItemForm(initialItemForm)
    setItemLines([])
    setPaymentLines([])
  }

  const handleNumberChange = (value: string, setter: (value: string) => void): void => {
    if (!isValidAmountInput(value)) return
    setter(value)
  }

  const handleItemChange = (selectedItemId: string): void => {
    const selectedItem = items.find((item) => item.id === selectedItemId)

    setItemForm((current) => ({
      ...current,
      itemId: selectedItemId,
      stampId: selectedItem?.defaultStampId || '',
      designId: selectedItem?.defaultDesignId || '',
      packWeight: String(selectedItem?.fixedWeightPerPcs || ''),
      tunch: String(selectedItem?.defaultTanch || ''),
      wastage: String(selectedItem?.defaultWastage || ''),
      labourRate: String(selectedItem?.defaultLabourRate || ''),
      labourRateType: getLabourRateType(selectedItem?.labourRateType || 'Kg')
    }))
  }

  const addItemLine = (): void => {
    if (!itemForm.itemId) {
      showAlert('warning', 'Please select item.')
      return
    }

    if (toNumber(itemForm.pcs) <= 0) {
      showAlert('warning', 'Please enter pcs.')
      return
    }

    if (toNumber(itemForm.grossWeight) <= 0) {
      showAlert('warning', 'Please enter gross weight.')
      return
    }

    const selectedItem = items.find((item) => item.id === itemForm.itemId)

    if (!selectedItem) {
      showAlert('warning', 'Selected item not found.')
      return
    }

    setItemLines((current) => [
      ...current,
      {
        lineNo: current.length + 1,
        itemId: itemForm.itemId,
        stampId: itemForm.stampId,
        designId: itemForm.designId,
        itemName: selectedItem.itemName,
        barcode: itemForm.barcode,
        remark: itemForm.remark,
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
        majuri: itemPreview.majuri
      }
    ])
    setItemForm(initialItemForm)
  }

  const removeItemLine = (lineNo: number): void => {
    setItemLines((current) =>
      current
        .filter((line) => line.lineNo !== lineNo)
        .map((line, index) => ({ ...line, lineNo: index + 1 }))
    )
  }

  const addPaymentLine = (): void => {
    const hasValue =
      toNumber(paymentForm.weight) > 0 ||
      toNumber(paymentForm.cash) > 0 ||
      toNumber(paymentForm.bank) > 0 ||
      toNumber(paymentForm.anamat) > 0

    if (!hasValue) {
      showAlert('warning', 'Please enter payment fine/cash/bank/anamat.')
      return
    }

    setPaymentLines((current) => [
      ...current,
      {
        lineNo: current.length + 1,
        type: paymentForm.type,
        details: paymentForm.details,
        pcs: toNumber(paymentForm.pcs),
        weight: toNumber(paymentForm.weight),
        tanch: toNumber(paymentForm.tanch),
        wastage: toNumber(paymentForm.wastage),
        hishob: paymentPreview.hishob,
        fine: paymentPreview.fine,
        rate: toNumber(paymentForm.rate),
        fineAmount: toNumber(paymentForm.fineAmount),
        anamat: toNumber(paymentForm.anamat),
        cash: toNumber(paymentForm.cash),
        bank: toNumber(paymentForm.bank)
      }
    ])
    setPaymentForm(initialPaymentForm)
  }

  const removePaymentLine = (lineNo: number): void => {
    setPaymentLines((current) =>
      current
        .filter((line) => line.lineNo !== lineNo)
        .map((line, index) => ({ ...line, lineNo: index + 1 }))
    )
  }

  const resetPurchase = useCallback(async (): Promise<void> => {
    setPurchaseDate(getTodayDate())
    setAccountId('')
    setPhone('')
    setMetalType('Silver')
    setHaste('')
    setDpNo('')
    setNarration('')
    setItemForm(initialItemForm)
    setPaymentForm(initialPaymentForm)
    setItemLines([])
    setPaymentLines([])
    setOldBalance(emptyBalance)

    const nextNo = await window.api.purchases.getNextNumber()
    setPurchaseNo(nextNo)
  }, [])

  const handleSave = async (): Promise<void> => {
    if (!purchaseDate) {
      showAlert('warning', 'Please select purchase date.')
      return
    }

    if (!accountId) {
      showAlert('warning', 'Please select account.')
      return
    }

    if (itemLines.length === 0) {
      showAlert('warning', 'Please add at least one item.')
      return
    }

    try {
      setSaving(true)

      await window.api.purchases.create({
        purchaseNo,
        purchaseDate,
        accountId,
        phone,
        metalType,
        haste,
        dpNo,
        narration,
        reminderDate: '',
        itemLines: itemLines.map((line) => ({
          itemId: line.itemId,
          stampId: line.stampId,
          designId: line.designId,
          barcode: line.barcode,
          remark: line.remark,
          pcs: line.pcs,
          grossWeight: line.grossWeight,
          packWeight: line.packWeight,
          addWeight: line.addWeight,
          tunch: line.tunch,
          wastage: line.wastage,
          labourRate: line.labourRate,
          labourRateType: line.labourRateType
        })),
        paymentLines: paymentLines.map((line) => ({
          type: line.type,
          details: line.details,
          pcs: line.pcs,
          weight: line.weight,
          tanch: line.tanch,
          wastage: line.wastage,
          rate: line.rate,
          fineAmount: line.fineAmount,
          anamat: line.anamat,
          cash: line.cash,
          bank: line.bank
        }))
      })

      showAlert('success', 'Purchase saved successfully.')
      await resetPurchase()
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
    <div className="purchase-screen">
      <div className="purchase-window">
        <div className="form-title-bar">
          <span>Purchase</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="purchase-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="purchase-main-layout">
            <div className="purchase-left">
              <div className="purchase-panel">
                <div className="section-title">Purchase Header</div>
                <div className="purchase-header-grid">
                  <Field label="Purchase No">
                    <input
                      value={purchaseNo}
                      onChange={(event) => setPurchaseNo(event.target.value)}
                    />
                  </Field>
                  <Field label="Date">
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(event) => setPurchaseDate(event.target.value)}
                    />
                  </Field>
                  <Field label="Account">
                    <select
                      value={accountId}
                      onChange={(event) => handleAccountChange(event.target.value)}
                    >
                      <option value="">Select Account</option>
                      {activeAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.accountName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Phone">
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </Field>
                  <Field label="Metal">
                    <select
                      value={metalType}
                      onChange={(event) => handleMetalChange(event.target.value as MetalType)}
                    >
                      <option>Gold</option>
                      <option>Silver</option>
                    </select>
                  </Field>
                  <Field label="Haste">
                    <input value={haste} onChange={(event) => setHaste(event.target.value)} />
                  </Field>
                  <Field label="DP No">
                    <input value={dpNo} onChange={(event) => setDpNo(event.target.value)} />
                  </Field>
                  <Field label="Narration">
                    <input
                      value={narration}
                      onChange={(event) => setNarration(event.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <div className="purchase-panel">
                <div className="section-title">Item Entry</div>
                <div className="purchase-item-grid">
                  <Field label="Item">
                    <select
                      value={itemForm.itemId}
                      onChange={(event) => handleItemChange(event.target.value)}
                    >
                      <option value="">Select Item</option>
                      {filteredItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Stamp">
                    <select
                      value={itemForm.stampId}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, stampId: event.target.value }))
                      }
                    >
                      <option value="">None</option>
                      {filteredStamps.map((stamp) => (
                        <option key={stamp.id} value={stamp.id}>
                          {stamp.stampName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Design">
                    <select
                      value={itemForm.designId}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, designId: event.target.value }))
                      }
                    >
                      <option value="">None</option>
                      {filteredDesigns.map((design) => (
                        <option key={design.id} value={design.id}>
                          {design.designName}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <NumberField
                    label="Pcs"
                    value={itemForm.pcs}
                    onChange={(value) => setItemForm((current) => ({ ...current, pcs: value }))}
                    onNumberChange={handleNumberChange}
                  />
                  <NumberField
                    label="Gross Wt."
                    value={itemForm.grossWeight}
                    onChange={(value) =>
                      setItemForm((current) => ({ ...current, grossWeight: value }))
                    }
                    onNumberChange={handleNumberChange}
                  />
                  <NumberField
                    label="Pack Wt."
                    value={itemForm.packWeight}
                    onChange={(value) =>
                      setItemForm((current) => ({ ...current, packWeight: value }))
                    }
                    onNumberChange={handleNumberChange}
                  />
                  <ReadOnlyField label="Less Wt." value={formatNumber(itemPreview.lessWeight)} />
                  <NumberField
                    label="Add Wt."
                    value={itemForm.addWeight}
                    onChange={(value) =>
                      setItemForm((current) => ({ ...current, addWeight: value }))
                    }
                    onNumberChange={handleNumberChange}
                  />
                  <ReadOnlyField label="Net Wt." value={formatNumber(itemPreview.netWeight)} />
                  <NumberField
                    label="Tunch"
                    value={itemForm.tunch}
                    onChange={(value) => setItemForm((current) => ({ ...current, tunch: value }))}
                    onNumberChange={handleNumberChange}
                  />
                  <NumberField
                    label="Wstg"
                    value={itemForm.wastage}
                    onChange={(value) => setItemForm((current) => ({ ...current, wastage: value }))}
                    onNumberChange={handleNumberChange}
                  />
                  <ReadOnlyField label="Hishob" value={formatNumber(itemPreview.hishob)} />
                  <ReadOnlyField label="Fine" value={formatNumber(itemPreview.fine)} />
                  <NumberField
                    label="Lab Rate"
                    value={itemForm.labourRate}
                    onChange={(value) =>
                      setItemForm((current) => ({ ...current, labourRate: value }))
                    }
                    onNumberChange={handleNumberChange}
                  />
                  <Field label="Lab Type">
                    <select
                      value={itemForm.labourRateType}
                      onChange={(event) =>
                        setItemForm((current) => ({
                          ...current,
                          labourRateType: getLabourRateType(event.target.value)
                        }))
                      }
                    >
                      <option>Kg</option>
                      <option>Gm</option>
                      <option>Pcs</option>
                    </select>
                  </Field>
                  <ReadOnlyField label="Majuri" value={formatNumber(itemPreview.majuri)} />
                </div>
                <div className="button-row purchase-button-row">
                  <button className="btn-save" type="button" onClick={addItemLine}>
                    Add Item
                  </button>
                </div>
              </div>

              <div className="table-panel purchase-table-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Sr</th>
                      <th>Item</th>
                      <th>Pcs</th>
                      <th>Gross</th>
                      <th>Less</th>
                      <th>Net</th>
                      <th>Tunch</th>
                      <th>Wstg</th>
                      <th>Fine</th>
                      <th>Majuri</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemLines.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="empty-row">
                          No item added.
                        </td>
                      </tr>
                    ) : (
                      itemLines.map((line) => (
                        <tr key={line.lineNo}>
                          <td>{line.lineNo}</td>
                          <td>{line.itemName}</td>
                          <td>{formatNumber(line.pcs)}</td>
                          <td>{formatNumber(line.grossWeight)}</td>
                          <td>{formatNumber(line.lessWeight)}</td>
                          <td>{formatNumber(line.netWeight)}</td>
                          <td>{formatNumber(line.tunch)}</td>
                          <td>{formatNumber(line.wastage)}</td>
                          <td>{formatNumber(line.fine)}</td>
                          <td>{formatNumber(line.majuri)}</td>
                          <td>
                            <button
                              className="btn-delete-small"
                              type="button"
                              onClick={() => removeItemLine(line.lineNo)}
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

              <div className="purchase-panel">
                <div className="section-title">Payment Nave</div>
                <div className="purchase-payment-grid">
                  <Field label="Type">
                    <select
                      value={paymentForm.type}
                      onChange={(event) =>
                        setPaymentForm((current) => ({ ...current, type: event.target.value }))
                      }
                    >
                      <option>CASH NAVE</option>
                      <option>BANK NAVE</option>
                      <option>FINE NAVE</option>
                      <option>ANAMAT NAVE</option>
                    </select>
                  </Field>
                  <NumberField
                    label="Weight"
                    value={paymentForm.weight}
                    onChange={(value) =>
                      setPaymentForm((current) => ({ ...current, weight: value }))
                    }
                    onNumberChange={handleNumberChange}
                  />
                  <NumberField
                    label="Tanch"
                    value={paymentForm.tanch}
                    onChange={(value) =>
                      setPaymentForm((current) => ({ ...current, tanch: value }))
                    }
                    onNumberChange={handleNumberChange}
                  />
                  <NumberField
                    label="Wstg"
                    value={paymentForm.wastage}
                    onChange={(value) =>
                      setPaymentForm((current) => ({ ...current, wastage: value }))
                    }
                    onNumberChange={handleNumberChange}
                  />
                  <ReadOnlyField label="Fine" value={formatNumber(paymentPreview.fine)} />
                  <NumberField
                    label="Cash"
                    value={paymentForm.cash}
                    onChange={(value) => setPaymentForm((current) => ({ ...current, cash: value }))}
                    onNumberChange={handleNumberChange}
                  />
                  <NumberField
                    label="Bank"
                    value={paymentForm.bank}
                    onChange={(value) => setPaymentForm((current) => ({ ...current, bank: value }))}
                    onNumberChange={handleNumberChange}
                  />
                  <NumberField
                    label="Anamat"
                    value={paymentForm.anamat}
                    onChange={(value) =>
                      setPaymentForm((current) => ({ ...current, anamat: value }))
                    }
                    onNumberChange={handleNumberChange}
                  />
                  <Field label="Details">
                    <input
                      value={paymentForm.details}
                      onChange={(event) =>
                        setPaymentForm((current) => ({ ...current, details: event.target.value }))
                      }
                    />
                  </Field>
                </div>
                <div className="button-row purchase-button-row">
                  <button className="btn-save" type="button" onClick={addPaymentLine}>
                    Add Payment
                  </button>
                </div>
              </div>

              <div className="table-panel purchase-payment-table-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Sr</th>
                      <th>Type</th>
                      <th>Weight</th>
                      <th>Fine</th>
                      <th>Cash</th>
                      <th>Bank</th>
                      <th>Anamat</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentLines.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="empty-row">
                          No payment added.
                        </td>
                      </tr>
                    ) : (
                      paymentLines.map((line) => (
                        <tr key={line.lineNo}>
                          <td>{line.lineNo}</td>
                          <td>{line.type}</td>
                          <td>{formatNumber(line.weight)}</td>
                          <td>{formatNumber(line.fine)}</td>
                          <td>{formatNumber(line.cash)}</td>
                          <td>{formatNumber(line.bank)}</td>
                          <td>{formatNumber(line.anamat)}</td>
                          <td>
                            <button
                              className="btn-delete-small"
                              type="button"
                              onClick={() => removePaymentLine(line.lineNo)}
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
            </div>

            <div className="purchase-right">
              <div className="purchase-balance-card">
                <div className="purchase-balance-title">Supplier Balance</div>
                <div className="purchase-account-name">
                  {selectedAccount?.accountName || 'No account selected'}
                </div>

                <BalanceLine label="Old Gold Fine" value={oldBalance.goldFine} />
                <BalanceLine label="Old Silver Fine" value={oldBalance.silverFine} />
                <BalanceLine label="Old Cash" value={oldBalance.cash} />
                <BalanceLine label="Old Bank" value={oldBalance.bank} />
                <BalanceLine label="Old Anamat" value={oldBalance.anamat} />

                <div className="purchase-balance-divider" />

                <BalanceLine label="Purchase Fine Jama" value={totals.itemFineTotal} />
                <BalanceLine label="Purchase Majuri Jama" value={totals.itemMajuriTotal} />
                <BalanceLine label="Payment Fine Nave" value={totals.paymentFineNaveTotal} />
                <BalanceLine label="Payment Cash Nave" value={totals.paymentCashNaveTotal} />
                <BalanceLine label="Payment Bank Nave" value={totals.paymentBankNaveTotal} />
                <BalanceLine label="Payment Anamat Nave" value={totals.paymentAnamatNaveTotal} />

                <div className="purchase-balance-divider" />

                <BalanceLine label="Closing Gold Fine" value={totals.closingGoldFine} strong />
                <BalanceLine label="Closing Silver Fine" value={totals.closingSilverFine} strong />
                <BalanceLine label="Closing Cash" value={totals.closingCash} strong />
                <BalanceLine label="Closing Bank" value={totals.closingBank} strong />
                <BalanceLine label="Closing Anamat" value={totals.closingAnamat} strong />
              </div>

              <div className="purchase-action-card">
                <button
                  className="btn-save purchase-save-btn"
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || loading}
                >
                  {saving ? 'Saving...' : 'Save Purchase'}
                </button>
                <button
                  className="btn-new purchase-reset-btn"
                  type="button"
                  onClick={() => void resetPurchase()}
                  disabled={saving}
                >
                  New Purchase
                </button>
                <div className="screen-help-text">
                  Purchase adds stock. Purchase item posts Jama to supplier account. Payment posts
                  Nave.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="form-field">
      <label>{label}</label>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  onNumberChange
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onNumberChange: (value: string, setter: (value: string) => void) => void
}): React.JSX.Element {
  return (
    <Field label={label}>
      <input value={value} onChange={(event) => onNumberChange(event.target.value, onChange)} />
    </Field>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="form-field readonly-field">
      <label>{label}</label>
      <input value={value} readOnly />
    </div>
  )
}

function BalanceLine({
  label,
  value,
  strong = false
}: {
  label: string
  value: number
  strong?: boolean
}): React.JSX.Element {
  return (
    <div className={strong ? 'purchase-balance-line strong' : 'purchase-balance-line'}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  )
}

export default PurchaseScreen
