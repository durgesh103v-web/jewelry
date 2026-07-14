import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import {
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

type PurchaseReturnItemLine = {
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

const emptyBalance: Balance = { goldFine: 0, silverFine: 0, cash: 0, bank: 0, anamat: 0 }

const initialHeader = {
  returnNo: '',
  returnDate: getTodayDate(),
  accountId: '',
  phone: '',
  metalType: 'Silver' as MetalType,
  againstPurchaseId: '',
  narration: ''
}

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

function PurchaseReturnScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [itemForm, setItemForm] = useState(initialItemForm)

  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [items, setItems] = useState<ItemRecord[]>([])
  const [stamps, setStamps] = useState<ItemStampRecord[]>([])
  const [designs, setDesigns] = useState<ItemDesignRecord[]>([])
  const [purchases, setPurchases] = useState<PurchaseRegisterRecord[]>([])
  const [returns, setReturns] = useState<PurchaseReturnRegisterRecord[]>([])

  const [itemLines, setItemLines] = useState<PurchaseReturnItemLine[]>([])
  const [oldBalance, setOldBalance] = useState<Balance>(emptyBalance)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [itemDeleteIndex, setItemDeleteIndex] = useState<number | null>(null)
  const [returnDeleteTarget, setReturnDeleteTarget] = useState<PurchaseReturnRegisterRecord | null>(
    null
  )
  const [detailRecord, setDetailRecord] = useState<SavedPurchaseReturnRecord | null>(null)

  const [searchText, setSearchText] = useState('')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [opening, setOpening] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === header.accountId),
    [accounts, header.accountId]
  )
  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])
  const filteredItems = useMemo(
    () => items.filter((item) => item.metalType === header.metalType && item.active),
    [items, header.metalType]
  )
  const filteredStamps = useMemo(
    () => stamps.filter((stamp) => stamp.metalType === header.metalType && stamp.active),
    [stamps, header.metalType]
  )
  const filteredDesigns = useMemo(
    () => designs.filter((design) => design.metalType === header.metalType && design.active),
    [designs, header.metalType]
  )
  const purchasesForAccount = useMemo(
    () => purchases.filter((purchase) => !header.accountId || purchase.accountId === header.accountId),
    [purchases, header.accountId]
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

  const totals = useMemo(() => {
    const itemFineTotal = itemLines.reduce((sum, line) => sum + Number(line.fine || 0), 0)
    const itemMajuriTotal = itemLines.reduce((sum, line) => sum + Number(line.majuri || 0), 0)

    // Purchase Return reverses a Purchase's Jama (credit): it posts the
    // same totals as a Nave (debit), so they ADD BACK to the balance
    // instead of subtracting from it.
    const closingGoldFine =
      header.metalType === 'Gold' ? oldBalance.goldFine + itemFineTotal : oldBalance.goldFine
    const closingSilverFine =
      header.metalType === 'Silver' ? oldBalance.silverFine + itemFineTotal : oldBalance.silverFine
    const closingCash = oldBalance.cash + itemMajuriTotal

    return {
      itemFineTotal,
      itemMajuriTotal,
      closingGoldFine,
      closingSilverFine,
      closingCash,
      closingBank: oldBalance.bank,
      closingAnamat: oldBalance.anamat
    }
  }, [itemLines, oldBalance, header.metalType])

  const filteredReturns = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return returns.filter((record) => {
      return (
        !keyword ||
        record.returnNo.toLowerCase().includes(keyword) ||
        record.accountName.toLowerCase().includes(keyword) ||
        record.mobileNumber.toLowerCase().includes(keyword) ||
        record.metalType.toLowerCase().includes(keyword) ||
        record.returnDate.toLowerCase().includes(keyword) ||
        (record.againstPurchaseNo || '').toLowerCase().includes(keyword)
      )
    })
  }, [returns, searchText])

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
        const balance = await window.api.purchaseReturns.getAccountBalance(selectedAccountId)
        setOldBalance(balance)
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      }
    },
    [showAlert]
  )

  const loadReturns = useCallback(async (): Promise<void> => {
    const data = await window.api.purchaseReturns.list()
    setReturns(data)
  }, [])

  const loadNextNumber = useCallback(async (): Promise<void> => {
    const nextNumber = await window.api.purchaseReturns.getNextNumber()
    setHeader((current) => ({ ...current, returnNo: nextNumber }))
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const [accountData, itemData, stampData, designData, purchaseData] = await Promise.all([
        window.api.accounts.list(),
        window.api.items.list(),
        window.api.itemStamps.list(),
        window.api.itemDesigns.list(),
        window.api.purchases.list()
      ])

      setAccounts(accountData)
      setItems(itemData)
      setStamps(stampData)
      setDesigns(designData)
      setPurchases(purchaseData)

      await Promise.all([loadReturns(), loadNextNumber()])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadReturns, loadNextNumber, showAlert])

  const handleAccountChange = (selectedAccountId: string): void => {
    const account = accounts.find((item) => item.id === selectedAccountId)

    setHeader((current) => ({
      ...current,
      accountId: selectedAccountId,
      phone: account?.mobileNumber || '',
      againstPurchaseId: ''
    }))
    void loadAccountBalance(selectedAccountId)
  }

  const handleMetalChange = (value: MetalType): void => {
    setHeader((current) => ({ ...current, metalType: value }))
    setItemForm(initialItemForm)
    setItemLines([])
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

  const handleConfirmRemoveItemLine = (): void => {
    if (itemDeleteIndex === null) return

    setItemLines((current) =>
      current
        .filter((_, index) => index !== itemDeleteIndex)
        .map((line, index) => ({ ...line, lineNo: index + 1 }))
    )
    setItemDeleteIndex(null)
  }

  const resetForm = useCallback(async (): Promise<void> => {
    setEditingId(null)
    setHeader(initialHeader)
    setItemForm(initialItemForm)
    setItemLines([])
    setOldBalance(emptyBalance)
    await loadNextNumber()
  }, [loadNextNumber])

  const buildPayload = (): PurchaseReturnPayload => {
    return {
      returnDate: header.returnDate,
      accountId: header.accountId,
      phone: header.phone,
      metalType: header.metalType,
      againstPurchaseId: header.againstPurchaseId,
      narration: header.narration,
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
      }))
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!header.returnDate) {
      showAlert('warning', 'Please select return date.')
      return
    }

    if (!header.accountId) {
      showAlert('warning', 'Please select account.')
      return
    }

    if (itemLines.length === 0) {
      showAlert('warning', 'Please add at least one item.')
      return
    }

    try {
      setSaving(true)

      const payload = buildPayload()

      if (editingId) {
        await window.api.purchaseReturns.update(editingId, payload)
      } else {
        await window.api.purchaseReturns.create(payload)
      }

      showAlert(
        'success',
        editingId ? 'Purchase return updated successfully.' : 'Purchase return saved successfully.'
      )
      await resetForm()
      await loadReturns()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditReturn = async (record: PurchaseReturnRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const data = await window.api.purchaseReturns.getById(record.id)

      setEditingId(data.header.id)
      setHeader({
        returnNo: data.header.return_no,
        returnDate: data.header.return_date,
        accountId: data.header.account_id,
        phone: data.header.mobile_number,
        metalType: data.header.metal_type as MetalType,
        againstPurchaseId: data.header.against_purchase_id || '',
        narration: data.header.narration
      })

      setItemLines(
        data.itemLines.map((line, index) => ({
          lineNo: index + 1,
          itemId: line.item_id,
          stampId: '',
          designId: '',
          itemName: line.item_name_snapshot,
          barcode: line.barcode,
          remark: line.remark,
          pcs: Number(line.pcs || 0),
          grossWeight: Number(line.gross_weight || 0),
          packWeight: Number(line.pack_weight || 0),
          lessWeight: Number(line.less_weight || 0),
          addWeight: Number(line.add_weight || 0),
          netWeight: Number(line.net_weight || 0),
          tunch: Number(line.tunch || 0),
          wastage: Number(line.wastage || 0),
          hishob: Number(line.hishob || 0),
          labourRate: Number(line.labour_rate || 0),
          labourRateType: getLabourRateType(line.labour_rate_type),
          fine: Number(line.fine || 0),
          majuri: Number(line.majuri || 0)
        }))
      )

      await loadAccountBalance(data.header.account_id)
      showAlert('success', `Editing purchase return ${data.header.return_no}.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleOpenDetail = async (record: PurchaseReturnRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const data = await window.api.purchaseReturns.getById(record.id)
      setDetailRecord(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleConfirmDeleteReturn = async (): Promise<void> => {
    if (!returnDeleteTarget) return

    try {
      setDeleting(true)
      const result = await window.api.purchaseReturns.remove(returnDeleteTarget.id)

      if (editingId === returnDeleteTarget.id) {
        await resetForm()
      }

      setReturnDeleteTarget(null)
      await loadReturns()
      showAlert('success', `Purchase return ${result.returnNo} voided successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
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
          <span>{editingId ? `Edit Purchase Return ${header.returnNo}` : 'Purchase Return'}</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="purchase-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="purchase-main-layout">
            <div className="purchase-left">
              <div className="purchase-panel">
                <div className="section-title">Purchase Return Header</div>
                <div className="purchase-header-grid">
                  <Field label="Return No">
                    <input value={header.returnNo} disabled />
                  </Field>
                  <Field label="Date">
                    <input
                      type="date"
                      value={header.returnDate}
                      onChange={(event) =>
                        setHeader((current) => ({ ...current, returnDate: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Account">
                    <select
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
                  </Field>
                  <Field label="Phone">
                    <input
                      value={header.phone}
                      onChange={(event) =>
                        setHeader((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Metal">
                    <select
                      value={header.metalType}
                      onChange={(event) => handleMetalChange(event.target.value as MetalType)}
                    >
                      <option>Gold</option>
                      <option>Silver</option>
                    </select>
                  </Field>
                  <Field label="Against Purchase (optional)">
                    <select
                      value={header.againstPurchaseId}
                      onChange={(event) =>
                        setHeader((current) => ({
                          ...current,
                          againstPurchaseId: event.target.value
                        }))
                      }
                    >
                      <option value="">Standalone Return</option>
                      {purchasesForAccount.map((purchase) => (
                        <option key={purchase.id} value={purchase.id}>
                          {purchase.purchaseNo} - {formatDate(purchase.purchaseDate)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Narration">
                    <input
                      value={header.narration}
                      onChange={(event) =>
                        setHeader((current) => ({ ...current, narration: event.target.value }))
                      }
                      placeholder="Optional"
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
                      itemLines.map((line, index) => (
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
                              onClick={() => setItemDeleteIndex(index)}
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

                <BalanceLine label="Return Fine Nave" value={totals.itemFineTotal} />
                <BalanceLine label="Return Majuri Nave" value={totals.itemMajuriTotal} />

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
                  {saving ? 'Saving...' : editingId ? 'Update Return' : 'Save Return'}
                </button>
                <button
                  className="btn-new purchase-reset-btn"
                  type="button"
                  onClick={() => void resetForm()}
                  disabled={saving}
                >
                  New Return
                </button>
                <div className="screen-help-text">
                  Purchase Return removes stock. Return item posts Nave to supplier account,
                  reversing the Jama that the original Purchase created.
                </div>
              </div>
            </div>
          </div>

          <div className="approval-list-panel">
            <div className="section-title">Saved Purchase Returns</div>

            <div className="approval-toolbar">
              <div className="list-search">
                <label htmlFor="purchase-return-search">Search</label>
                <input
                  id="purchase-return-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search return no, account, mobile, purchase no, date"
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
                onClick={() => void loadReturns()}
                disabled={loading}
              >
                Refresh
              </button>

              <div className="record-summary">
                Total: <strong>{returns.length}</strong> | Showing:{' '}
                <strong>{filteredReturns.length}</strong>
              </div>
            </div>

            <div className="table-panel approval-table-panel">
              <table>
                <thead>
                  <tr>
                    <th>Sr</th>
                    <th>Return No</th>
                    <th>Date</th>
                    <th>Account</th>
                    <th>Mobile</th>
                    <th>Metal</th>
                    <th>Against Purchase</th>
                    <th>Fine</th>
                    <th>Majuri</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="empty-row">
                        Loading purchase returns...
                      </td>
                    </tr>
                  ) : filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="empty-row">
                        {searchText ? 'No matching purchase return found.' : 'No purchase return saved yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((record, index) => (
                      <tr key={record.id}>
                        <td>{index + 1}</td>
                        <td>{record.returnNo}</td>
                        <td>{formatDate(record.returnDate)}</td>
                        <td>{record.accountName}</td>
                        <td>{record.mobileNumber || '-'}</td>
                        <td>{record.metalType}</td>
                        <td>{record.againstPurchaseNo || 'Standalone'}</td>
                        <td>{formatNumber(record.itemFineTotal)}</td>
                        <td>{formatNumber(record.itemMajuriTotal)}</td>
                        <td>
                          <div className="sale-register-actions approval-actions">
                            <button
                              className="table-edit"
                              type="button"
                              onClick={() => void handleOpenDetail(record)}
                              disabled={opening}
                            >
                              View
                            </button>
                            <button
                              className="table-edit"
                              type="button"
                              onClick={() => void handleEditReturn(record)}
                              disabled={opening || saving}
                            >
                              Edit
                            </button>
                            <button
                              className="table-delete"
                              type="button"
                              onClick={() => setReturnDeleteTarget(record)}
                              disabled={deleting}
                            >
                              Void
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={itemDeleteIndex !== null}
        title="Remove Item Line?"
        message={
          itemDeleteIndex !== null && itemLines[itemDeleteIndex]
            ? `Are you sure you want to remove "${itemLines[itemDeleteIndex].itemName}" from this return?`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmRemoveItemLine}
        onCancel={() => setItemDeleteIndex(null)}
      />

      <AppConfirmDialog
        open={Boolean(returnDeleteTarget)}
        title="Void Purchase Return?"
        message={
          returnDeleteTarget
            ? `Purchase return "${returnDeleteTarget.returnNo}" for "${returnDeleteTarget.accountName}" will be voided. Stock and account ledger effect will be removed.`
            : ''
        }
        confirmText="Void"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDeleteReturn()}
        onCancel={() => {
          if (!deleting) setReturnDeleteTarget(null)
        }}
      />

      {detailRecord && (
        <div className="print-preview-overlay">
          <div className="approval-detail-dialog">
            <div className="form-title-bar">
              <span>Purchase Return {detailRecord.header.return_no}</span>

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
                  <strong>{formatDate(detailRecord.header.return_date)}</strong>
                </div>
                <div>
                  <span>Metal</span>
                  <strong>{detailRecord.header.metal_type}</strong>
                </div>
                <div>
                  <span>Against Purchase</span>
                  <strong>{detailRecord.header.against_purchase_no || 'Standalone'}</strong>
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
                      <th>Sr</th>
                      <th>Item</th>
                      <th>Pcs</th>
                      <th>Net Wt.</th>
                      <th>Fine</th>
                      <th>Majuri</th>
                    </tr>
                  </thead>

                  <tbody>
                    {detailRecord.itemLines.map((line, index) => (
                      <tr key={line.id}>
                        <td>{index + 1}</td>
                        <td>{line.item_name_snapshot}</td>
                        <td>{formatNumber(line.pcs)}</td>
                        <td>{formatNumber(line.net_weight)}</td>
                        <td>{formatNumber(line.fine)}</td>
                        <td>{formatNumber(line.majuri)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
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

export default PurchaseReturnScreen
